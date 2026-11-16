module.exports = {
  inputs: {
    values: {
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
    const { card, ...values } = inputs.values;

    const taskLists = await TaskList.find({ cardId: card.id }).sort('position');

    if (_.isUndefined(values.position)) {
      values.position = (_.last(taskLists)?.position || 0) + sails.config.custom.positionGap;
    }

    const { position, repositions } = sails.helpers.utils.insertToPositionables(values.position, taskLists);

    // eslint-disable-next-line no-restricted-syntax
    for (const { id, position: nextPosition } of repositions) {
      // eslint-disable-next-line no-await-in-loop
      await TaskList.updateOne(id).set({ position: nextPosition });
      sails.sockets.broadcast(`board:${card.boardId}`, 'taskListUpdate', { item: { id, position: nextPosition } });
    }

    const taskList = await TaskList.create({
      ...values,
      position,
      cardId: card.id,
      createdById: inputs.currentUser.id,
    }).fetch();

    sails.sockets.broadcast(`board:${card.boardId}`, 'taskListCreate', { item: taskList }, inputs.request);

    return taskList;
  },
};
