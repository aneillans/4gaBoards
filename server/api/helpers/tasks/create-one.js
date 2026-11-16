const valuesValidator = (value) => {
  if (!_.isPlainObject(value)) {
    return false;
  }

  if (!_.isUndefined(value.position) && !_.isFinite(value.position)) {
    return false;
  }

  if (!_.isPlainObject(value.card)) {
    return false;
  }

  return true;
};

module.exports = {
  inputs: {
    values: {
      type: 'ref',
      custom: valuesValidator,
      required: true,
    },
    currentUser: {
      type: 'ref',
      required: true,
    },
    skipMetaUpdate: {
      type: 'boolean',
      defaultsTo: false,
    },
    duplicate: {
      type: 'boolean',
      defaultsTo: false,
    },
    skipActions: {
      type: 'boolean',
      defaultsTo: false,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values, currentUser, skipMetaUpdate, skipActions } = inputs;

    // Tasks live in a task list; without one they go into the card's first list
    let taskListId = values.taskListId || (values.taskList && values.taskList.id);
    if (!taskListId) {
      ({ id: taskListId } = await sails.helpers.taskLists.getOrCreateDefault.with({ card: values.card, currentUser, request: inputs.request }));
    }
    delete values.taskList;
    values.taskListId = taskListId;

    if (_.isUndefined(values.position)) {
      const [lastTask] = await Task.find({ taskListId }).sort('position DESC').limit(1);
      values.position = (lastTask?.position || 0) + sails.config.custom.positionGap;
    }

    const tasks = await Task.find({ taskListId }).sort('position');

    const { position, repositions } = sails.helpers.utils.insertToPositionables(values.position, tasks);

    repositions.forEach(async ({ id, position: nextPosition }) => {
      await Task.update({
        id,
        cardId: values.card.id,
      }).set({
        position: nextPosition,
      });

      sails.sockets.broadcast(`board:${values.card.boardId}`, 'taskUpdate', {
        item: {
          id,
          position: nextPosition,
        },
      });
    });

    const task = await Task.create({
      ...values,
      position,
      cardId: values.card.id,
      createdById: currentUser.id,
    }).fetch();

    if (task) {
      sails.sockets.broadcast(
        `board:${values.card.boardId}`,
        'taskCreate',
        {
          item: task,
        },
        inputs.request,
      );

      if (!skipActions) {
        await sails.helpers.actions.createOne.with({
          values: {
            task,
            card: values.card,
            scope: Action.Scopes.TASK,
            type: inputs.duplicate ? Action.Types.CARD_TASK_DUPLICATE : Action.Types.CARD_TASK_CREATE,
            data: {
              taskId: task.id,
              taskName: task.name,
            },
          },
          currentUser,
          request: inputs.request,
        });
      }

      await sails.helpers.cards.updateMeta.with({ id: task.cardId, currentUser, skipMetaUpdate });
      await sails.helpers.boards.updateStats.with({ boardId: values.card.boardId });
    }

    return task;
  },
};
