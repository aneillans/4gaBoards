// Deletes a task list together with its tasks, through the normal task delete so each task gets its
// broadcast and activity

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    currentUser: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { record, card, board, currentUser } = inputs;

    const tasks = await Task.find({ taskListId: record.id });

    // eslint-disable-next-line no-restricted-syntax
    for (const task of tasks) {
      // eslint-disable-next-line no-await-in-loop
      await sails.helpers.tasks.deleteOne.with({ record: task, board, currentUser, request: inputs.request });
    }

    const taskList = await TaskList.archiveOne(record.id);

    if (taskList) {
      sails.sockets.broadcast(`board:${card.boardId}`, 'taskListDelete', { item: taskList }, inputs.request);
    }

    return taskList;
  },
};
