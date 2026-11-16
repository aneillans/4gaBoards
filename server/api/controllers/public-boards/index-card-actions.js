const Errors = {
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
};

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
    cardId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    beforeId: {
      type: 'string',
      regex: /^[0-9]+$/,
    },
  },

  exits: {
    cardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { board, card } = await sails.helpers.boards.getPublicCard(inputs.publicId, inputs.cardId).intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    if (!board.publicShowActivity) {
      throw Errors.CARD_NOT_FOUND;
    }

    const actions = await sails.helpers.actions.getManyForPublic.with({ board, cardId: card.id, beforeId: inputs.beforeId });
    const users = await sails.helpers.users.getMany(sails.helpers.utils.mapRecords(actions, 'userId', true), true);

    return {
      items: actions,
      included: {
        users: sails.helpers.users.sanitizeForPublic(users),
      },
    };
  },
};
