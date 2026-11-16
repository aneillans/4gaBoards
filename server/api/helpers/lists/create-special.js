// Ensures a board has its archive and trash lists, creating whichever is missing. Safe to call more
// than once: the database allows only one list of each special type per board.

module.exports = {
  inputs: {
    board: {
      type: 'ref',
      required: true,
    },
    currentUser: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { board, currentUser } = inputs;

    const existing = await List.find({ boardId: board.id, type: List.SPECIAL_TYPES });
    const listsByType = _.keyBy(existing, 'type');

    // eslint-disable-next-line no-restricted-syntax
    for (const type of List.SPECIAL_TYPES) {
      if (!listsByType[type]) {
        // eslint-disable-next-line no-await-in-loop
        listsByType[type] = await List.create({
          boardId: board.id,
          type,
          position: 0,
          name: `common.${type}`,
          isCollapsed: false,
          isCompleted: false,
          createdById: currentUser.id,
        }).fetch();
      }
    }

    return {
      archive: listsByType[List.Types.ARCHIVE],
      trash: listsByType[List.Types.TRASH],
    };
  },
};
