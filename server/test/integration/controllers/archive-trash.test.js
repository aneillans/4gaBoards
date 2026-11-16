const { expect } = require('chai');

const request = (url, { method = 'GET', data, accessToken } = {}) =>
  new Promise((resolve) => {
    sails.request({ url, method, data, headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} }, (error, response, body) => {
      resolve({ status: error ? error.status : response.statusCode, body: error ? error.body : body });
    });
  });

describe('archive and trash lists', () => {
  let editor;
  let viewer;
  let project;
  let board;
  let todo;
  let done;
  let archive;
  let trash;
  let editorToken;
  let viewerToken;
  let createAction;
  let nextCardId = 7600;

  const createCard = async (values) => {
    nextCardId += 1;

    return Card.create({
      id: String(nextCardId),
      position: nextCardId,
      name: `Card ${nextCardId}`,
      commentCount: 0,
      isCreatedViaApi: false,
      isCompleted: false,
      boardId: board.id,
      listId: todo.id,
      createdById: editor.id,
      ...values,
    }).fetch();
  };

  const moveCard = (card, list, accessToken = editorToken) => request(`/api/cards/${card.id}`, { method: 'PATCH', data: { listId: list.id, position: 65535 }, accessToken });

  before(async () => {
    editor = await User.create({ id: '7001', email: 'editor@test.test', password: 'test', name: 'Editor', username: 'editor', createdById: '0' }).fetch();
    viewer = await User.create({ id: '7002', email: 'viewer@test.test', password: 'test', name: 'Viewer', username: 'viewer', createdById: '0' }).fetch();
    project = await Project.create({ id: '7101', name: 'Project', createdById: editor.id }).fetch();
    await ProjectManager.create({ id: '7151', projectId: project.id, userId: editor.id, createdById: editor.id });
    board = await Board.create({ id: '7201', position: 1, name: 'Board', isGithubConnected: false, isImportedBoard: false, projectId: project.id, createdById: editor.id }).fetch();
    await BoardMembership.create({ id: '7301', role: 'editor', boardId: board.id, userId: editor.id, createdById: editor.id });
    await BoardMembership.create({ id: '7302', role: 'viewer', boardId: board.id, userId: viewer.id, createdById: editor.id });

    todo = await List.create({ id: '7401', position: 1, name: 'To do', isCollapsed: false, isCompleted: false, boardId: board.id, createdById: editor.id }).fetch();
    done = await List.create({ id: '7402', position: 2, name: 'Done', isCollapsed: false, isCompleted: true, boardId: board.id, createdById: editor.id }).fetch();
    // Created here with string ids (sails-disk would generate numeric ones); createSpecial must then
    // find them rather than create duplicates
    archive = await List.create({ id: '7403', type: 'archive', position: 0, name: 'common.archive', isCollapsed: false, isCompleted: false, boardId: board.id, createdById: editor.id }).fetch();
    trash = await List.create({ id: '7404', type: 'trash', position: 0, name: 'common.trash', isCollapsed: false, isCompleted: false, boardId: board.id, createdById: editor.id }).fetch();

    editorToken = sails.helpers.utils.createToken(editor.id);
    viewerToken = sails.helpers.utils.createToken(viewer.id);
    await Session.create({ id: '7501', accessToken: editorToken, remoteAddress: '127.0.0.1', userId: editor.id });
    await Session.create({ id: '7502', accessToken: viewerToken, remoteAddress: '127.0.0.1', userId: viewer.id });

    // sails-disk generates numeric ids, which the activity records created by these actions reject as
    // string-pk associations. Activity creation is not under test here.
    createAction = sails.helpers.actions.createOne;
    sails.helpers.actions.createOne = { with: async () => undefined };
  });

  after(async () => {
    sails.helpers.actions.createOne = createAction;

    await Card.destroy({ boardId: board.id });
    await List.destroy({ boardId: board.id });
    await Session.destroy({ userId: [editor.id, viewer.id] });
    await BoardMembership.destroy({ boardId: board.id });
    await ProjectManager.destroy({ projectId: project.id });
    await Board.destroy({ id: board.id });
    await Project.destroy({ id: project.id });
    await User.destroy({ id: [editor.id, viewer.id] });
  });

  describe('lists.createSpecial', () => {
    it('creates one archive and one trash list and is safe to call again', async () => {
      await sails.helpers.lists.createSpecial.with({ board, currentUser: editor });

      const specialLists = await List.find({ boardId: board.id, type: List.SPECIAL_TYPES });

      expect(specialLists.map((list) => list.type)).to.have.members(['archive', 'trash']);
      expect(archive.name).to.equal('common.archive');
      expect(trash.name).to.equal('common.trash');
    });
  });

  describe('moving cards', () => {
    it('remembers the previous list and keeps the done state when archiving', async () => {
      const card = await createCard({ listId: done.id, isCompleted: true });

      const { status, body } = await moveCard(card, archive);

      expect(status).to.equal(200);
      expect(body.item.listId).to.equal(archive.id);
      expect(body.item.prevListId).to.equal(done.id);
      expect(body.item.isCompleted).to.equal(true);
      expect(body.item.listChangedAt).to.be.a('string');
    });

    it('keeps the archive as the previous list when moving from archive to trash, and forgets it on the way out of the trash', async () => {
      const card = await createCard();

      await moveCard(card, archive);
      const trashed = await moveCard(card, trash);
      expect(trashed.body.item.prevListId).to.equal(archive.id);

      const restored = await moveCard(card, todo);
      expect(restored.body.item.prevListId).to.equal(null);
      expect(restored.body.item.isCompleted).to.equal(false);
    });

    it('lets a normal list decide the done state again on restore', async () => {
      const card = await createCard({ listId: done.id, isCompleted: true });

      await moveCard(card, archive);
      const restored = await moveCard(card, todo);

      expect(restored.body.item.isCompleted).to.equal(false);
      expect(restored.body.item.prevListId).to.equal(null);
    });

    it('does not let a viewer archive a card', async () => {
      const card = await createCard();

      const { status } = await moveCard(card, archive, viewerToken);

      expect(status).to.not.equal(200);
      expect((await Card.findOne(card.id)).listId).to.equal(todo.id);
    });
  });

  describe('guards', () => {
    it('refuses to rename or delete the archive and trash lists', async () => {
      expect((await request(`/api/lists/${archive.id}`, { method: 'PATCH', data: { name: 'Renamed' }, accessToken: editorToken })).status).to.equal(403);
      expect((await request(`/api/lists/${trash.id}`, { method: 'DELETE', accessToken: editorToken })).status).to.equal(403);
      expect((await List.findOne(archive.id)).name).to.equal('common.archive');
    });

    it('refuses to create a card directly in the archive', async () => {
      const { status } = await request(`/api/lists/${archive.id}/cards`, { method: 'POST', data: { name: 'Sneaky', position: 1 }, accessToken: editorToken });

      expect(status).to.equal(403);
    });

    it('refuses to mark a card in the trash as done', async () => {
      const card = await createCard({ listId: trash.id });

      const { status } = await request(`/api/cards/${card.id}/mark-completed`, { method: 'POST', data: { isCompleted: true }, accessToken: editorToken });

      expect(status).to.equal(403);
    });
  });

  describe('board statistics', () => {
    it('leaves archived and trashed cards out of card counts', async () => {
      const before = (await sails.helpers.boards.getCardStats(board.id))[board.id].total;

      await createCard({ listId: archive.id });
      await createCard({ listId: trash.id });
      await createCard();

      const after = (await sails.helpers.boards.getCardStats(board.id))[board.id].total;

      expect(after - before).to.equal(1);
    });
  });

  describe('POST /api/lists/:id/clear', () => {
    it('only empties the trash', async () => {
      const { status } = await request(`/api/lists/${archive.id}/clear`, { method: 'POST', accessToken: editorToken });

      expect(status).to.equal(403);
    });

    it('does not let a viewer empty the trash', async () => {
      await createCard({ listId: trash.id });

      const { status } = await request(`/api/lists/${trash.id}/clear`, { method: 'POST', accessToken: viewerToken });

      expect(status).to.equal(403);
      expect(await Card.count({ listId: trash.id })).to.be.above(0);
    });

    it('deletes every card in the trash and leaves other lists alone', async () => {
      await createCard({ listId: trash.id });
      const kept = await createCard({ listId: archive.id });

      const { status, body } = await request(`/api/lists/${trash.id}/clear`, { method: 'POST', accessToken: editorToken });

      expect(status).to.equal(200);
      expect(body.deletedCount).to.be.above(0);
      expect(await Card.count({ listId: trash.id })).to.equal(0);
      expect(await Card.findOne(kept.id)).to.not.equal(undefined);
    });
  });

  describe('automatic trash emptying', () => {
    it('deletes only cards that have been in the trash longer than the board allows', async () => {
      await Board.updateOne(board.id).set({ trashAutoEmptyDays: 7 });
      const now = new Date('2026-11-20T12:00:00Z');

      const old = await createCard({ listId: trash.id, listChangedAt: '2026-11-10T12:00:00.000Z' });
      const recent = await createCard({ listId: trash.id, listChangedAt: '2026-11-18T12:00:00.000Z' });

      const deleted = await sails.helpers.boards.autoEmptyTrash.with({ now });

      expect(deleted).to.equal(1);
      expect(await Card.findOne(old.id)).to.equal(undefined);
      expect(await Card.findOne(recent.id)).to.not.equal(undefined);
    });

    it('does nothing on boards that have it switched off', async () => {
      await Board.updateOne(board.id).set({ trashAutoEmptyDays: null });
      await createCard({ listId: trash.id, listChangedAt: '2020-01-01T00:00:00.000Z' });

      const deleted = await sails.helpers.boards.autoEmptyTrash.with({ now: new Date('2026-11-20T12:00:00Z') });

      expect(deleted).to.equal(0);
    });
  });

  describe('PATCH /api/boards/:id trashAutoEmptyDays', () => {
    it('accepts a number of days and null, and rejects zero', async () => {
      expect((await request(`/api/boards/${board.id}`, { method: 'PATCH', data: { trashAutoEmptyDays: 30 }, accessToken: editorToken })).body.item.trashAutoEmptyDays).to.equal(30);
      expect((await request(`/api/boards/${board.id}`, { method: 'PATCH', data: { trashAutoEmptyDays: null }, accessToken: editorToken })).body.item.trashAutoEmptyDays).to.equal(null);
      expect((await request(`/api/boards/${board.id}`, { method: 'PATCH', data: { trashAutoEmptyDays: 0 }, accessToken: editorToken })).status).to.equal(400);
    });
  });
});
