const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
};

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
    beforeId: {
      type: 'string',
      regex: /^[0-9]+$/,
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { board } = await sails.helpers.boards.getPublicPath(inputs.publicId).intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    if (!board.publicShowActivity) {
      throw Errors.BOARD_NOT_FOUND;
    }

    const actions = await sails.helpers.actions.getManyForPublic.with({ board, beforeId: inputs.beforeId });
    const users = await sails.helpers.users.getMany(sails.helpers.utils.mapRecords(actions, 'userId', true), true);

    return {
      items: actions,
      included: {
        users: sails.helpers.users.sanitizeForPublic(users),
      },
    };
  },
};
