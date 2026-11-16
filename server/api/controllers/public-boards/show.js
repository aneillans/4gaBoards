// Read-only snapshot of a public board for anonymous visitors. Mirrors the boards/show payload so
// the client can render it with the ordinary board UI. Members, attachments and their related
// records are included only when the board opts into them.

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
};

const PUBLIC_BOARD_FIELDS = ['id', 'position', 'name', 'projectId', 'isPublic', 'publicId', 'publicShowMembers', 'publicShowComments', 'publicShowActivity', 'publicShowAttachments', 'createdAt', 'updatedAt'];
const PUBLIC_PROJECT_FIELDS = ['id', 'name', 'background', 'backgroundImage', 'createdAt', 'updatedAt'];

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { board, project } = await sails.helpers.boards.getPublicPath(inputs.publicId).intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    const labels = await sails.helpers.boards.getLabels(board.id);
    // Archive and trash stay private: neither those lists nor their cards are shown publicly
    const lists = await sails.helpers.boards.getLists.with({ idOrIds: board.id, onlyActive: true });
    const activeListIds = new Set(sails.helpers.utils.mapRecords(lists));
    const cards = (await sails.helpers.boards.getCards(board.id)).filter((card) => activeListIds.has(card.listId));
    const cardIds = sails.helpers.utils.mapRecords(cards);
    const cardLabels = await sails.helpers.cards.getCardLabels(cardIds);
    const taskLists = await TaskList.find({ cardId: cardIds }).sort('position');
    const tasks = await sails.helpers.cards.getTasks(cardIds);

    let users = [];
    let boardMemberships = [];
    let cardMemberships = [];
    let taskMemberships = [];
    let attachments = [];

    if (board.publicShowMembers) {
      boardMemberships = await sails.helpers.boards.getBoardMemberships(board.id);
      cardMemberships = await sails.helpers.cards.getCardMemberships(cardIds);
      taskMemberships = await sails.helpers.cards.getTaskMemberships(sails.helpers.utils.mapRecords(tasks));

      const userIds = _.compact(
        _.union(
          sails.helpers.utils.mapRecords(boardMemberships, 'userId'),
          sails.helpers.utils.mapRecords(cards, 'createdById', true),
          sails.helpers.utils.mapRecords(cards, 'updatedById', true),
          sails.helpers.utils.mapRecords(cards, 'completedById', true),
        ),
      );
      users = sails.helpers.users.sanitizeForPublic(await sails.helpers.users.getMany(userIds, true));

      boardMemberships = boardMemberships.map((boardMembership) => _.pick(boardMembership, ['id', 'boardId', 'userId', 'role', 'canComment', 'createdAt', 'updatedAt']));
    }

    if (board.publicShowAttachments) {
      attachments = sails.helpers.attachments.presentForPublic(await sails.helpers.cards.getAttachments(cardIds), board.publicId);
    }

    const publicCards = cards.map((card) => ({
      ..._.omit(card, ['mailCreatorAddress']),
      coverAttachmentId: board.publicShowAttachments ? card.coverAttachmentId : null,
      commentCount: board.publicShowComments ? card.commentCount : 0,
      isSubscribed: false,
    }));

    // Anonymous visitors have no stored preferences, so they get the defaults a new user starts with
    const userPrefs = Object.entries(UserPrefs.attributes).reduce((result, [name, attribute]) => (_.isUndefined(attribute.defaultsTo) ? result : { ...result, [name]: attribute.defaultsTo }), {});

    return {
      item: _.pick(board, PUBLIC_BOARD_FIELDS),
      userPrefs,
      included: {
        users,
        boardMemberships,
        labels,
        lists,
        mailTokens: [],
        cards: publicCards,
        cardMemberships,
        cardLabels,
        taskLists,
        tasks,
        taskMemberships,
        attachments,
        projects: [_.pick(project.toJSON ? project.toJSON() : project, PUBLIC_PROJECT_FIELDS)],
      },
    };
  },
};
