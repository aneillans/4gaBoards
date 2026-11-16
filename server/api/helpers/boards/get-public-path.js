// Resolves a board by its public id for anonymous access. Boards that are not public resolve the
// same as missing ones, so callers never disclose whether a public id exists.

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    pathNotFound: {},
  },

  async fn(inputs) {
    const board = await Board.findOne({ publicId: inputs.publicId, isPublic: true });

    if (!board) {
      throw 'pathNotFound';
    }

    const project = await Project.findOne(board.projectId);

    if (!project) {
      throw 'pathNotFound';
    }

    return {
      board,
      project,
    };
  },
};
