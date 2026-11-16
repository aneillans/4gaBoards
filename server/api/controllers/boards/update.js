const crypto = require('crypto');

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
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
    isGithubConnected: {
      type: 'boolean',
    },
    githubRepo: {
      type: 'string',
    },
    trashAutoEmptyDays: {
      type: 'number',
      allowNull: true,
      isInteger: true,
      min: 1,
      max: 3650,
    },
    isPublic: {
      type: 'boolean',
    },
    publicShowMembers: {
      type: 'boolean',
    },
    publicShowComments: {
      type: 'boolean',
    },
    publicShowActivity: {
      type: 'boolean',
    },
    publicShowAttachments: {
      type: 'boolean',
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let { board } = await sails.helpers.boards.getProjectPath(inputs.id).intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    if (!board) {
      throw Errors.BOARD_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, board.projectId);

    if (!isProjectManager) {
      throw Errors.BOARD_NOT_FOUND; // Forbidden
    }

    const values = _.pick(inputs, [
      'position',
      'name',
      'isGithubConnected',
      'githubRepo',
      'trashAutoEmptyDays',
      'isPublic',
      'publicShowMembers',
      'publicShowComments',
      'publicShowActivity',
      'publicShowAttachments',
    ]);

    // A fresh public id on every publish, so a link revoked by going private never works again
    if (values.isPublic === true && !board.isPublic) {
      values.publicId = crypto.randomBytes(18).toString('base64url');
    } else if (values.isPublic === false) {
      values.publicId = null;
    }

    board = await sails.helpers.boards.updateOne.with({
      values,
      record: board,
      currentUser,
      request: this.req,
    });

    if (!board) {
      throw Errors.BOARD_NOT_FOUND;
    }

    return {
      item: board,
    };
  },
};
