// Runs one pass of automatic trash emptying across all boards that have it switched on. There is no
// system user, so the deletions are attributed to the board's creator.

module.exports = {
  inputs: {
    now: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const now = inputs.now || new Date();
    const boards = await Board.find({ trashAutoEmptyDays: { '!=': null } });

    let deletedTotal = 0;

    // eslint-disable-next-line no-restricted-syntax
    for (const board of boards) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const list = await List.findOne({ boardId: board.id, type: List.Types.TRASH });
        // eslint-disable-next-line no-await-in-loop
        const currentUser = await User.findOne({ id: board.createdById });

        if (list && currentUser) {
          const olderThan = new Date(now.getTime() - board.trashAutoEmptyDays * 24 * 60 * 60 * 1000).toISOString();
          // eslint-disable-next-line no-await-in-loop
          deletedTotal += await sails.helpers.lists.clearTrash.with({ list, olderThan, currentUser });
        }
      } catch (error) {
        sails.log.error(`Trash auto-empty failed for board ${board.id}:`, error);
      }
    }

    if (deletedTotal > 0) {
      sails.log.info(`Trash auto-empty deleted ${deletedTotal} card(s)`);
    }

    return deletedTotal;
  },
};
