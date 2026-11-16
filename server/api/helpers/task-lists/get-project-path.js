module.exports = {
  inputs: {
    criteria: {
      type: 'json',
      required: true,
    },
  },

  exits: {
    pathNotFound: {},
  },

  async fn(inputs) {
    const taskList = await TaskList.findOne(inputs.criteria);

    if (!taskList) {
      throw 'pathNotFound';
    }

    const path = await sails.helpers.cards.getProjectPath(taskList.cardId).intercept('pathNotFound', (nodes) => ({
      pathNotFound: {
        taskList,
        ...nodes,
      },
    }));

    return {
      taskList,
      ...path,
    };
  },
};
