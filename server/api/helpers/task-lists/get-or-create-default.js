// The task list new tasks go into when none is given: the card's first list, created on demand

module.exports = {
  inputs: {
    card: {
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
    const [taskList] = await TaskList.find({ cardId: inputs.card.id }).sort('position').limit(1);

    if (taskList) {
      return taskList;
    }

    return sails.helpers.taskLists.createOne.with({
      values: { card: inputs.card, name: 'common.tasks' },
      currentUser: inputs.currentUser,
      request: inputs.request,
    });
  },
};
