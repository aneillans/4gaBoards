const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  TASK_LIST_NOT_FOUND: {
    taskListNotFound: 'Task list not found',
  },
};

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    position: {
      type: 'number',
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
    },
    showOnFrontOfCard: {
      type: 'boolean',
    },
    hideCompletedTasks: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    taskListNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { taskList, card, board } = await sails.helpers.taskLists.getProjectPath(inputs.id).intercept('pathNotFound', () => Errors.TASK_LIST_NOT_FOUND);

    const boardMembership = await BoardMembership.findOne({ boardId: board.id, userId: currentUser.id });

    if (!boardMembership) {
      throw Errors.TASK_LIST_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const updatedTaskList = await sails.helpers.taskLists.updateOne.with({
      record: taskList,
      values: _.pick(inputs, ['position', 'name', 'showOnFrontOfCard', 'hideCompletedTasks']),
      card,
      currentUser,
      request: this.req,
    });

    if (!updatedTaskList) {
      throw Errors.TASK_LIST_NOT_FOUND;
    }

    return {
      item: updatedTaskList,
    };
  },
};
