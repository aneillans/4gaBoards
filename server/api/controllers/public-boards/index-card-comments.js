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

    if (!board.publicShowComments) {
      throw Errors.CARD_NOT_FOUND;
    }

    const comments = await sails.helpers.cards.getComments(card.id, inputs.beforeId);
    const users = await sails.helpers.users.getMany(sails.helpers.utils.mapRecords(comments, 'userId', true), true);

    return {
      items: comments,
      included: {
        users: sails.helpers.users.sanitizeForPublic(users),
      },
    };
  },
};
