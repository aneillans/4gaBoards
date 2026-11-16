// Ids of the archive and trash lists of the given boards. Cards in these lists are left out of board
// statistics.

module.exports = {
  inputs: {
    idOrIds: {
      type: 'json',
      required: true,
    },
  },

  async fn(inputs) {
    const lists = await List.find({ boardId: inputs.idOrIds, type: List.SPECIAL_TYPES });

    return new Set(lists.map((list) => list.id));
  },
};
