// Activity of a public board, filtered by the board's visibility flags. Comment and attachment
// activity carries their content, so it follows those facets; mail token and GitHub details are
// member-only and never exposed.

const HIDDEN_DATA_KEYS = ['githubRepo', 'prevGithubRepo', 'isGithubConnected', 'prevIsGithubConnected'];

module.exports = {
  inputs: {
    board: {
      type: 'ref',
      required: true,
    },
    cardId: {
      type: 'string',
    },
    beforeId: {
      type: 'string',
    },
  },

  async fn(inputs) {
    const { board } = inputs;

    const hiddenScopes = [];
    if (!board.publicShowComments) {
      hiddenScopes.push(Action.Scopes.COMMENT);
    }
    if (!board.publicShowAttachments) {
      hiddenScopes.push(Action.Scopes.ATTACHMENT);
    }

    const criteria = {
      boardId: board.id,
      type: { nin: [Action.Types.MAIL_TOKEN_CREATE, Action.Types.MAIL_TOKEN_UPDATE, Action.Types.MAIL_TOKEN_DELETE] },
    };

    if (hiddenScopes.length > 0) {
      criteria.scope = { nin: hiddenScopes };
    }

    if (inputs.cardId) {
      criteria.cardId = inputs.cardId;
    }

    if (!_.isUndefined(inputs.beforeId)) {
      criteria.id = { '<': inputs.beforeId };
    }

    const actions = await sails.helpers.actions.getMany(criteria, sails.config.custom.actionsLimit);

    return actions.map((action) => ({
      ...action,
      data: _.omit(action.data, HIDDEN_DATA_KEYS),
    }));
  },
};
