/* eslint-disable no-await-in-loop, no-restricted-syntax -- rows are imported in order, one at a time: later rows depend on earlier ones and volumes are small */
// Re-runnable Planka v2 -> 4ga Boards import.
//
// Every Planka row gets a PlankaImportRecord holding the 4ga record it became, a hash of the source
// row and the raw row itself, so nothing from Planka is lost even where 4ga has no place for it.
// Running again:
//   - creates what is new in Planka,
//   - updates what changed in Planka since the last run (Planka wins),
//   - leaves unchanged rows alone,
//   - reports what was deleted in Planka without deleting anything in 4ga.
// Writes go straight to the models, keeping original timestamps and authors and without
// notifications or broadcasts.

const crypto = require('crypto');
const fs = require('fs');
const _ = require('lodash');
const os = require('os');
const path = require('path');

const LABEL_COLORS = {
  'muddy-grey': '#69655a',
  'autumn-leafs': '#c9b037',
  'morning-sky': '#52b9d5',
  'antique-blue': '#6c99bb',
  'egg-yellow': '#f9c423',
  'desert-sand': '#fad371',
  'dark-granite': '#8b8680',
  'fresh-salad': '#ced85e',
  'lagoon-blue': '#109dc0',
  'midnight-blue': '#0a63a0',
  'light-orange': '#fdae5f',
  'pumpkin-orange': '#ed9223',
  'light-concrete': '#afb0a4',
  'sunny-grass': '#beca02',
  'navy-blue': '#1d7299',
  'lilac-eyes': '#406cbd',
  'apricot-red': '#fc736c',
  'orange-peel': '#de692f',
  'silver-glint': '#adadad',
  'bright-moss': '#96b352',
  'deep-ocean': '#004c70',
  'summer-sky': '#5d9cec',
  'berry-red': '#e83855',
  'light-cocoa': '#a85540',
  'grey-stone': '#aab2bd',
  'tank-green': '#8aa177',
  'coral-green': '#2b6a6c',
  'sugar-plum': '#7e86c7',
  'pink-tulip': '#e34f7c',
  'shady-rust': '#87564a',
  'wet-rock': '#83949b',
  'wet-moss': '#4a8753',
  'turquoise-sea': '#00858a',
  'lavender-fields': '#b287bd',
  'piggy-red': '#f97394',
  'light-mud': '#c7a57a',
  'gun-metal': '#4f6573',
  'modern-green': '#77ce87',
  'french-coast': '#00b4b1',
  'sweet-lilac': '#975298',
  'red-burgundy': '#ad5f7d',
  'pirate-gold': '#a54e07',
};
const FALLBACK_LABEL_COLOR = '#8b8680';

// Fields never stored, even in the raw archive
const SECRET_FIELDS = {
  user_account: ['password', 'apiKeyHash', 'apiKeyPrefix'],
  webhook: ['accessToken'],
};

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value instanceof Date ? value.toISOString() : value);
};

const hashOf = (value) => crypto.createHash('sha1').update(stableStringify(value)).digest('hex');

const toIso = (value) => (value ? new Date(value).toISOString() : null);

const parseJson = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

module.exports = async ({ snapshot, dataPath, currentUser, dryRun = false, oidcIssuer, log = () => {} }) => {
  const report = { tables: {}, deletedInPlanka: [], missingFiles: [], warnings: [] };
  const count = (table, outcome) => {
    report.tables[table] = report.tables[table] || {};
    report.tables[table][outcome] = (report.tables[table][outcome] || 0) + 1;
  };

  const records = new Map((await PlankaImportRecord.find()).map((record) => [`${record.sourceTable}:${record.sourceId}`, record]));
  const seen = new Set();
  const now = new Date().toISOString();

  // A dry run writes nothing: it classifies every Planka row as new, already imported, or deleted
  if (dryRun) {
    for (const [table, rows] of Object.entries(snapshot)) {
      for (const row of rows) {
        const key = `${table}:${row.id}`;
        seen.add(key);
        count(table, records.has(key) ? 'alreadyImported' : 'new');
      }
    }
    for (const [key, record] of records) {
      if (!seen.has(key) && !record.deletedInSourceAt) {
        report.deletedInPlanka.push({ table: record.sourceTable, id: record.sourceId, targetTable: record.targetTable, targetId: record.targetId });
      }
    }

    return report;
  }

  const targetIdOf = (table, sourceId) => (sourceId ? (records.get(`${table}:${sourceId}`)?.targetId ?? null) : null);

  const saveRecord = async (table, sourceId, targetTable, targetId, raw, hash, isLinked = false) => {
    const key = `${table}:${sourceId}`;
    const existing = records.get(key);
    const values = { targetTable, targetId: targetId ? String(targetId) : null, isLinked, sourceHash: hash, raw, deletedInSourceAt: null };

    const record = existing ? await PlankaImportRecord.updateOne(existing.id).set(values) : await PlankaImportRecord.create({ ...values, sourceTable: table, sourceId }).fetch();
    records.set(key, record);
  };

  const prepare = (table, row, extraHashInput) => {
    const sourceId = String(row.id);
    const raw = _.omit(row, SECRET_FIELDS[table] || []);
    seen.add(`${table}:${sourceId}`);

    return { sourceId, raw, hash: hashOf(extraHashInput === undefined ? raw : { raw, extra: extraHashInput }) };
  };

  // Rows 4ga keeps only in the raw archive
  const archive = async (table, row) => {
    const { sourceId, raw, hash } = prepare(table, row);
    const existing = records.get(`${table}:${sourceId}`);

    if (existing && existing.sourceHash === hash) {
      count(table, 'unchanged');
      return;
    }

    count(table, existing ? 'updated' : 'archived');
    await saveRecord(table, sourceId, null, null, raw, hash);
  };

  // Rows that map onto an existing 4ga record without creating one (matched users, archive/trash lists)
  const link = async (table, row, targetTable, targetId) => {
    const { sourceId, raw, hash } = prepare(table, row);
    const existing = records.get(`${table}:${sourceId}`);

    if (existing && existing.sourceHash === hash && existing.targetId === String(targetId)) {
      count(table, 'unchanged');
      return targetId;
    }

    count(table, 'linked');
    await saveRecord(table, sourceId, targetTable, targetId, raw, hash, true);
    return targetId;
  };

  // Rows that become a 4ga record of their own. buildValues returns null to skip a row.
  const sync = async (table, row, Model, buildValues, { extraHashInput, afterWrite } = {}) => {
    const { sourceId, raw, hash } = prepare(table, row, extraHashInput);
    const existing = records.get(`${table}:${sourceId}`);
    const targetTable = Model.tableName;

    if (existing && existing.targetId) {
      const target = await Model.findOne(existing.targetId);

      if (target) {
        if (existing.sourceHash === hash) {
          count(table, 'unchanged');
          return existing.targetId;
        }

        count(table, 'updated');
        const values = await buildValues(row, { isUpdate: true, target });
        if (values) {
          await Model.updateOne(existing.targetId).set(values);
          if (afterWrite) await afterWrite(target.id, row);
        }
        await saveRecord(table, sourceId, targetTable, existing.targetId, raw, hash);
        return existing.targetId;
      }
    }

    const values = await buildValues(row, { isUpdate: false });
    if (!values) {
      count(table, 'skipped');
      await saveRecord(table, sourceId, null, null, raw, hash);
      return null;
    }

    const created = await Model.create(values).fetch();
    count(table, 'created');
    await saveRecord(table, sourceId, targetTable, created.id, raw, hash);
    if (afterWrite) await afterWrite(created.id, row);
    return created.id;
  };

  const byId = (table) => _.keyBy(snapshot[table], 'id');
  const groupBy = (table, key) => _.groupBy(snapshot[table], key);
  const userIdOf = (plankaUserId) => targetIdOf('user_account', plankaUserId) ?? currentUser.id;

  const filePath = (...segments) => path.join(dataPath || '', ...segments);
  const fileExists = (fullPath) => !!dataPath && fs.existsSync(fullPath);
  // The first of Planka's stored sizes that exists; some originals are missing in real data
  const firstExistingFile = (dir, names) => names.map((name) => filePath(...dir, name)).find(fileExists) || null;

  // 4ga's avatar and background helpers delete the file they are given, as it is normally an upload.
  // They only ever get a temporary copy, so Planka's files are never touched.
  const withTempCopy = async (sourcePath, fn) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'planka-import-'));
    const tempPath = path.join(dir, path.basename(sourcePath));

    try {
      fs.copyFileSync(sourcePath, tempPath);
      return await fn(tempPath);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  /* Users: matched by OIDC subject, then email, then username; created otherwise */

  // 4ga usernames are 3-16 characters with a stricter pattern; anything else is left empty (users sign
  // in through SSO) and reported, with the original kept in the raw archive
  const usableUsername = async (row) => {
    const username = row.username && row.username.toLowerCase();
    const isValid = username && username.length >= 3 && username.length <= 16 && /^[a-z0-9]+((_|\.)?[a-z0-9])*$/.test(username);

    if (username && (!isValid || (await User.findOne({ username })))) {
      report.warnings.push(`user ${row.email}: username "${row.username}" does not fit 4ga or is taken, left empty`);
      return null;
    }

    return username || null;
  };

  const identities = groupBy('identity_provider_user', 'userId');
  for (const plankaUser of snapshot.user_account) {
    const subjects = (identities[plankaUser.id] || []).filter((identity) => !oidcIssuer || identity.issuer === oidcIssuer).map((identity) => identity.sub);
    const fallbackSubjects = (identities[plankaUser.id] || []).map((identity) => identity.sub);

    // Users the importer created itself are updated from Planka; existing accounts are only linked
    const previous = records.get(`user_account:${plankaUser.id}`);
    const createdByImport = previous && previous.targetId && !previous.isLinked && (await User.findOne(previous.targetId));
    let match = previous && previous.targetId && previous.isLinked ? await User.findOne(previous.targetId) : null;

    if (!match && !createdByImport) {
      for (const sub of [...subjects, ...fallbackSubjects]) {
        match = await User.findOne({ ssoOidcId: sub });
        if (match) break;
      }
    }
    if (!match && !createdByImport && plankaUser.email) {
      match = await User.findOne({ email: plankaUser.email.toLowerCase() });
    }
    if (!match && !createdByImport && plankaUser.username) {
      match = await User.findOne({ username: plankaUser.username.toLowerCase() });
    }

    const avatar = parseJson(plankaUser.avatar);
    const avatarPath = avatar && firstExistingFile(['protected', 'user-avatars', String(avatar.uploadedFileId)], [`original.${avatar.extension}`, `cover-180.${avatar.extension}`]);
    const hasAvatarFile = !!avatarPath;

    if (match) {
      // Existing 4ga accounts are linked, never overwritten
      await link('user_account', plankaUser, User.tableName, match.id);
    } else {
      await sync(
        'user_account',
        plankaUser,
        User,
        async (row, { isUpdate, target }) => {
          const values = {
            name: row.name,
            phone: row.phone || null,
            organization: row.organization || null,
            isAdmin: row.role === 'admin',
            deletedAt: row.isDeactivated ? now : null,
          };

          if (!isUpdate) {
            Object.assign(values, {
              email: row.email.toLowerCase(),
              username: await usableUsername(row),
              ssoOidcId: subjects[0] || fallbackSubjects[0] || null,
              ssoOidcEmail: subjects[0] || fallbackSubjects[0] ? row.email.toLowerCase() : null,
              createdAt: toIso(row.createdAt),
              createdById: currentUser.id,
            });
          }

          // Added on any run where the file is available and the account has none yet
          if (hasAvatarFile && !(isUpdate && target.avatar)) {
            const fileData = await withTempCopy(avatarPath, (tempPath) => sails.helpers.users.processUploadedAvatarFile({ fd: tempPath, filename: `original.${avatar.extension}` }));
            values.avatar = { dirname: fileData.dirname, extension: avatar.extension };
          } else if (avatar && !hasAvatarFile) {
            report.missingFiles.push(`avatar of ${row.email}: ${filePath('protected', 'user-avatars', String(avatar.uploadedFileId))}`);
          }

          return values;
        },
        {
          // A file that turns up later counts as a change, so it gets picked up
          extraHashInput: hasAvatarFile,
          afterWrite: async (userId) => {
            if (!(await UserPrefs.findOne(userId))) {
              await sails.helpers.userPrefs.createOne.with({ values: { id: userId }, currentUser });
            }
          },
        },
      );
    }
  }
  for (const identity of snapshot.identity_provider_user) await archive('identity_provider_user', identity);

  /* Projects, managers and backgrounds */

  const backgroundImages = byId('background_image');
  const backgroundImagePath = (image) =>
    firstExistingFile(['protected', 'background-images', String(image.uploadedFileId)], [`original.${image.extension}`, `outside-720.${image.extension}`, `outside-360.${image.extension}`]);
  for (const project of snapshot.project) {
    await sync(
      'project',
      project,
      Project,
      async (row, { isUpdate, target }) => {
        const values = { name: row.name, description: row.description || null, background: null, backgroundImage: null };

        if (row.backgroundType === 'gradient' && row.backgroundGradient) {
          values.background = { type: 'gradient', name: row.backgroundGradient };
        } else if (row.backgroundType === 'image' && backgroundImages[row.backgroundImageId]) {
          const image = backgroundImages[row.backgroundImageId];
          const imagePath = backgroundImagePath(image);

          if (isUpdate && target.backgroundImage) {
            values.background = target.background;
            values.backgroundImage = target.backgroundImage;
          } else if (imagePath) {
            const fileData = await withTempCopy(imagePath, (tempPath) => sails.helpers.projects.processUploadedBackgroundImageFile({ fd: tempPath, filename: `original.${image.extension}` }));
            values.background = { type: 'image' };
            values.backgroundImage = _.pick(fileData, ['dirname', 'extension']);
          } else {
            report.missingFiles.push(`background of project ${row.name}: ${filePath('protected', 'background-images', String(image.uploadedFileId))}`);
          }
        }

        if (!isUpdate) {
          Object.assign(values, { createdAt: toIso(row.createdAt), createdById: currentUser.id });
        }

        return values;
      },
      {
        // A background file that turns up later counts as a change, so it gets picked up
        extraHashInput: (() => {
          const image = backgroundImages[project.backgroundImageId];
          return image ? { image, hasFile: !!backgroundImagePath(image) } : null;
        })(),
      },
    );
  }
  for (const image of snapshot.background_image) await archive('background_image', image);
  for (const manager of snapshot.project_manager) {
    const projectId = targetIdOf('project', manager.projectId);
    const userId = targetIdOf('user_account', manager.userId);

    if (!projectId || !userId) {
      await archive('project_manager', manager);
    } else {
      const existing = await ProjectManager.findOne({ projectId, userId });
      await (existing && !targetIdOf('project_manager', manager.id)
        ? link('project_manager', manager, ProjectManager.tableName, existing.id)
        : sync('project_manager', manager, ProjectManager, (row) => ({ projectId, userId, createdAt: toIso(row.createdAt), createdById: currentUser.id })));
    }
  }

  /* Boards, memberships and subscriptions */

  const boardSubscriptions = _.groupBy(snapshot.board_subscription, (row) => `${row.boardId}:${row.userId}`);
  for (const board of snapshot.board) {
    await sync(
      'board',
      board,
      Board,
      (row, { isUpdate }) => {
        const projectId = targetIdOf('project', row.projectId);
        if (!projectId) return null;

        const values = {
          name: row.name,
          position: row.position,
          isPublic: !!row.isPublic,
          publicId: row.isPublic ? row.publicId : null,
          publicShowMembers: !!row.publicShowMembers,
          publicShowComments: !!row.publicShowComments,
          publicShowActivity: !!row.publicShowActivity,
          publicShowAttachments: false,
        };

        if (!isUpdate) {
          Object.assign(values, { projectId, isGithubConnected: false, isImportedBoard: true, createdAt: toIso(row.createdAt), createdById: currentUser.id });
        }

        return values;
      },
      {
        afterWrite: async (boardId) => {
          await sails.helpers.lists.createSpecial.with({ board: { id: boardId }, currentUser });
        },
      },
    );
  }
  for (const membership of snapshot.board_membership) {
    const boardId = targetIdOf('board', membership.boardId);
    const userId = targetIdOf('user_account', membership.userId);

    if (!boardId || !userId) {
      await archive('board_membership', membership);
    } else {
      const isSubscribed = !!boardSubscriptions[`${membership.boardId}:${membership.userId}`];
      const existing = await BoardMembership.findOne({ boardId, userId });
      await (existing && !targetIdOf('board_membership', membership.id)
        ? link('board_membership', membership, BoardMembership.tableName, existing.id)
        : sync(
            'board_membership',
            membership,
            BoardMembership,
            (row, { isUpdate }) => ({ role: row.role, canComment: row.canComment, isSubscribed, ...(!isUpdate && { boardId, userId, createdAt: toIso(row.createdAt), createdById: currentUser.id }) }),
            { extraHashInput: isSubscribed },
          ));
    }
  }
  for (const subscription of snapshot.board_subscription) await archive('board_subscription', subscription);

  /* Labels and lists */
  for (const label of snapshot.label) {
    await sync('label', label, Label, (row, { isUpdate }) => {
      const boardId = targetIdOf('board', row.boardId);
      if (!boardId) return null;

      if (row.color && !LABEL_COLORS[row.color]) {
        report.warnings.push(`label ${row.name || row.id}: unknown colour ${row.color}, using ${FALLBACK_LABEL_COLOR}`);
      }

      // Colour-only Planka labels get the colour as their name; the raw row keeps the original
      return {
        name: row.name || _.startCase(row.color || 'label'),
        color: LABEL_COLORS[row.color] || FALLBACK_LABEL_COLOR,
        ...(!isUpdate && { boardId, createdAt: toIso(row.createdAt), createdById: currentUser.id }),
      };
    });
  }
  for (const list of snapshot.list) {
    const boardId = targetIdOf('board', list.boardId);

    if (!boardId) {
      await archive('list', list);
    } else if (list.type === 'archive' || list.type === 'trash') {
      const special = (await List.findOne({ boardId, type: list.type })) || (await sails.helpers.lists.createSpecial.with({ board: { id: boardId }, currentUser }))[list.type];
      await link('list', list, List.tableName, special.id);
    } else {
      await sync('list', list, List, (row, { isUpdate }) => ({
        name: row.name || 'List',
        position: row.position,
        isCompleted: row.type === 'closed',
        ...(!isUpdate && { boardId, type: 'active', isCollapsed: false, createdAt: toIso(row.createdAt), createdById: currentUser.id }),
      }));
    }
  }

  /* Cards, with custom field values folded into the description */

  const customFields = byId('custom_field');
  const customValuesByCard = groupBy('custom_field_value', 'cardId');
  const describeCustomFields = (cardId) => {
    const values = (customValuesByCard[cardId] || []).filter((value) => value.content);
    if (values.length === 0) return '';

    return `\n\n---\n**Custom fields (from Planka)**\n${values.map((value) => `- ${customFields[value.customFieldId]?.name || 'Field'}: ${value.content}`).join('\n')}`;
  };
  for (const card of snapshot.card) {
    await sync(
      'card',
      card,
      Card,
      (row, { isUpdate }) => {
        const boardId = targetIdOf('board', row.boardId);
        const listId = targetIdOf('list', row.listId);
        if (!boardId || !listId) return null;

        const description = `${row.description || ''}${describeCustomFields(row.id)}`.trim();

        return {
          listId,
          name: row.name,
          description: description || null,
          position: row.position ?? 0,
          dueDate: toIso(row.dueDate),
          timer: parseJson(row.stopwatch) || null,
          isCompleted: !!row.isClosed,
          completedAt: row.isClosed ? toIso(row.listChangedAt || row.updatedAt || row.createdAt) : null,
          prevListId: targetIdOf('list', row.prevListId),
          listChangedAt: toIso(row.listChangedAt),
          commentCount: row.commentsTotal || 0,
          ...(!isUpdate && { boardId, isCreatedViaApi: false, createdAt: toIso(row.createdAt), createdById: userIdOf(row.creatorUserId) }),
        };
      },
      { extraHashInput: customValuesByCard[card.id] || null },
    );
  }
  for (const cardLabel of snapshot.card_label) {
    const cardId = targetIdOf('card', cardLabel.cardId);
    const labelId = targetIdOf('label', cardLabel.labelId);
    await (cardId && labelId ? sync('card_label', cardLabel, CardLabel, (row) => ({ cardId, labelId, createdAt: toIso(row.createdAt), createdById: currentUser.id })) : archive('card_label', cardLabel));
  }
  for (const cardMembership of snapshot.card_membership) {
    const cardId = targetIdOf('card', cardMembership.cardId);
    const userId = targetIdOf('user_account', cardMembership.userId);
    await (cardId && userId
      ? sync('card_membership', cardMembership, CardMembership, (row) => ({ cardId, userId, createdAt: toIso(row.createdAt), createdById: currentUser.id }))
      : archive('card_membership', cardMembership));
  }
  for (const subscription of snapshot.card_subscription) {
    const cardId = targetIdOf('card', subscription.cardId);
    const userId = targetIdOf('user_account', subscription.userId);
    await (cardId && userId
      ? sync('card_subscription', subscription, CardSubscription, (row) => ({ cardId, userId, isPermanent: !!row.isPermanent, createdAt: toIso(row.createdAt) }))
      : archive('card_subscription', subscription));
  }

  /* Task lists and tasks */

  const cardsById = byId('card');
  for (const taskList of snapshot.task_list) {
    const cardId = targetIdOf('card', taskList.cardId);
    await (cardId
      ? sync('task_list', taskList, TaskList, (row, { isUpdate }) => ({
          name: row.name || 'common.tasks',
          position: row.position,
          showOnFrontOfCard: row.showOnFrontOfCard !== false,
          hideCompletedTasks: !!row.hideCompletedTasks,
          ...(!isUpdate && { cardId, createdAt: toIso(row.createdAt), createdById: userIdOf(cardsById[row.cardId]?.creatorUserId) }),
        }))
      : archive('task_list', taskList));
  }

  const taskListsById = byId('task_list');
  for (const task of snapshot.task) {
    const taskListId = targetIdOf('task_list', task.taskListId);
    const plankaCardId = taskListsById[task.taskListId]?.cardId;
    const cardId = targetIdOf('card', plankaCardId);

    if (!taskListId || !cardId) {
      await archive('task', task);
    } else {
      await sync(
        'task',
        task,
        Task,
        (row, { isUpdate }) => ({
          name: row.name,
          position: row.position,
          isCompleted: !!row.isCompleted,
          completedAt: row.isCompleted ? toIso(row.updatedAt || row.createdAt) : null,
          ...(!isUpdate && { cardId, taskListId, createdAt: toIso(row.createdAt), createdById: userIdOf(cardsById[plankaCardId]?.creatorUserId) }),
        }),
        {
          afterWrite: async (taskId, row) => {
            const assigneeId = targetIdOf('user_account', row.assigneeUserId);
            await TaskMembership.destroy({ taskId });
            if (assigneeId) {
              await TaskMembership.create({ taskId, userId: assigneeId, createdById: currentUser.id });
            }
          },
        },
      );
    }
  }

  /* Attachments, with files copied through 4ga's own processing */
  for (const attachment of snapshot.attachment) {
    const cardId = targetIdOf('card', attachment.cardId);
    const data = parseJson(attachment.data) || {};

    if (!cardId || attachment.type !== 'file') {
      await archive('attachment', attachment);
    } else {
      const sourcePath = filePath('private', 'attachments', String(data.uploadedFileId), data.filename || '');
      await sync('attachment', attachment, Attachment, async (row, { isUpdate }) => {
        if (isUpdate) {
          return { name: row.name };
        }

        if (!fileExists(sourcePath)) {
          report.missingFiles.push(`attachment ${row.name}: ${sourcePath}`);
          return null;
        }

        const fileData = await sails.helpers.attachments.processUploadedFile.with({ file: { fd: sourcePath, filename: data.filename }, copyFile: true });

        return { cardId, name: row.name, dirname: fileData.dirname, filename: fileData.filename, image: fileData.image, createdAt: toIso(row.createdAt), createdById: userIdOf(row.creatorUserId) };
      });
    }
  }

  // Covers, once attachments exist
  for (const card of snapshot.card) {
    const cardId = targetIdOf('card', card.id);
    if (cardId) {
      await Card.updateOne(cardId).set({ coverAttachmentId: targetIdOf('attachment', card.coverAttachmentId) });
    }
  }

  /* Comments */

  const usersById = byId('user_account');
  for (const comment of snapshot.comment) {
    const cardId = targetIdOf('card', comment.cardId);
    await (cardId
      ? sync('comment', comment, Comment, (row, { isUpdate }) => {
          const userId = userIdOf(row.userId);
          return {
            data: { text: row.text, userId, userName: usersById[row.userId]?.name ?? null },
            ...(!isUpdate && { cardId, userId, createdAt: toIso(row.createdAt), createdById: userId }),
            updatedAt: toIso(row.updatedAt),
          };
        })
      : archive('comment', comment));
  }

  /* Activity: Planka's six action types, mapped onto 4ga's */
  for (const action of snapshot.action) {
    const plankaCard = cardsById[action.cardId];
    const cardId = targetIdOf('card', action.cardId);
    const data = parseJson(action.data) || {};
    const card = cardId && (await Card.findOne(cardId));
    const board = card && (await Board.findOne(card.boardId));

    const mapped = (() => {
      const cardName = data.card?.name ?? plankaCard?.name;
      switch (action.type) {
        case 'createCard':
          return { scope: 'card', type: 'cardCreate', data: { cardName, listId: targetIdOf('list', data.list?.id), listName: data.list?.name, isCreatedViaApi: false } };
        case 'moveCard':
          return {
            scope: 'card',
            type: 'cardMove',
            data: { cardName, listFromId: targetIdOf('list', data.fromList?.id), listFromName: data.fromList?.name, listToId: targetIdOf('list', data.toList?.id), listToName: data.toList?.name },
          };
        case 'addMemberToCard':
          return { scope: 'card', type: 'cardUserAdd', data: { cardName, userId: targetIdOf('user_account', data.user?.id), userName: data.user?.name } };
        case 'removeMemberFromCard':
          return { scope: 'card', type: 'cardUserRemove', data: { cardName, userId: targetIdOf('user_account', data.user?.id), userName: data.user?.name } };
        case 'completeTask':
        case 'uncompleteTask':
          return {
            scope: 'task',
            type: 'cardTaskUpdate',
            taskId: targetIdOf('task', data.task?.id),
            data: { cardName, taskId: targetIdOf('task', data.task?.id), taskName: data.task?.name, taskIsCompleted: action.type === 'completeTask' },
          };
        default:
          return null;
      }
    })();

    if (!mapped || !card || !board) {
      await archive('action', action);
    } else {
      await sync('action', action, Action, (row) => ({
        scope: mapped.scope,
        type: mapped.type,
        data: { ...mapped.data, plankaActionId: String(row.id) },
        cardId: card.id,
        listId: card.listId,
        boardId: board.id,
        projectId: board.projectId,
        taskId: mapped.taskId || undefined,
        userId: userIdOf(row.userId),
        createdById: currentUser.id,
        createdAt: toIso(row.createdAt),
      }));
    }
  }

  /* Everything 4ga has no place for yet stays in the raw archive */
  for (const table of ['project_favorite', 'base_custom_field_group', 'custom_field_group', 'custom_field', 'custom_field_value', 'notification_service', 'webhook']) {
    for (const row of snapshot[table] || []) await archive(table, row);
  }

  /* Deletions in Planka: reported, never applied */
  for (const [key, record] of records) {
    if (!seen.has(key) && !record.deletedInSourceAt) {
      report.deletedInPlanka.push({ table: record.sourceTable, id: record.sourceId, targetTable: record.targetTable, targetId: record.targetId });
      await PlankaImportRecord.updateOne(record.id).set({ deletedInSourceAt: now });
    }
  }

  log('Import finished');

  return report;
};
