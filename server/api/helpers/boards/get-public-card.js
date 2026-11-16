// Resolves a card on a public board, or throws pathNotFound when the board is not public or the
// card belongs to another board.

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
    cardId: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    pathNotFound: {},
  },

  async fn(inputs) {
    const { board } = await sails.helpers.boards.getPublicPath(inputs.publicId);
    const card = await Card.findOne({ id: inputs.cardId, boardId: board.id });
    const list = card && (await List.findOne(card.listId));

    // Archived and trashed cards are not public
    if (!card || !list || sails.helpers.lists.isSpecial(list)) {
      throw 'pathNotFound';
    }

    return {
      board,
      card,
    };
  },
};
