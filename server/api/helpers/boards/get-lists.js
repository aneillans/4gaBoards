const idOrIdsValidator = (value) => _.isString(value) || _.every(value, _.isString);

module.exports = {
  inputs: {
    idOrIds: {
      type: 'json',
      custom: idOrIdsValidator,
      required: true,
    },
    exceptListIdOrIds: {
      type: 'json',
      custom: idOrIdsValidator,
    },
    onlyActive: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  async fn(inputs) {
    const criteria = {
      boardId: inputs.idOrIds,
    };

    if (!_.isUndefined(inputs.exceptListIdOrIds)) {
      criteria.id = {
        '!=': inputs.exceptListIdOrIds,
      };
    }

    if (inputs.onlyActive) {
      criteria.type = List.Types.ACTIVE;
    }

    return sails.helpers.lists.getMany(criteria);
  },
};
