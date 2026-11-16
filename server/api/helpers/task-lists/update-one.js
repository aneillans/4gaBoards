module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    values: {
      type: 'ref',
      required: true,
    },
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
    const { record, card } = inputs;
    const values = { ...inputs.values };

    if (!_.isUndefined(values.position)) {
      const taskLists = await TaskList.find({ cardId: card.id, id: { '!=': record.id } }).sort('position');
      const { position, repositions } = sails.helpers.utils.insertToPositionables(values.position, taskLists);

      values.position = position;

      // eslint-disable-next-line no-restricted-syntax
      for (const { id, position: nextPosition } of repositions) {
        // eslint-disable-next-line no-await-in-loop
        await TaskList.updateOne(id).set({ position: nextPosition });
        sails.sockets.broadcast(`board:${card.boardId}`, 'taskListUpdate', { item: { id, position: nextPosition } });
      }
    }

    const taskList = await TaskList.updateOne(record.id).set({ ...values, updatedById: inputs.currentUser.id });

    if (taskList) {
      sails.sockets.broadcast(`board:${card.boardId}`, 'taskListUpdate', { item: taskList }, inputs.request);
    }

    return taskList;
  },
};
