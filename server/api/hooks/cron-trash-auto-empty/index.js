const cron = require('node-cron');

// Empties trash lists automatically on boards that opted in, deleting cards that have been in the
// trash for longer than the board's trashAutoEmptyDays.

module.exports = function defineCronTrashAutoEmptyHook(sails) {
  return {
    initialize(cb) {
      sails.log.info('Initializing custom hook: cron-trash-auto-empty');

      cron.schedule(sails.config.custom.trashAutoEmptyCronSchedule, async () => {
        try {
          await sails.helpers.boards.autoEmptyTrash();
        } catch (error) {
          sails.log.error('Trash auto-empty cron failed:', error);
        }
      });

      cb();
    },
  };
};
