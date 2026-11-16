// Resolves an attachment on a public board that shares attachments, or throws pathNotFound.

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
    id: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    pathNotFound: {},
  },

  async fn(inputs) {
    const { board } = await sails.helpers.boards.getPublicPath(inputs.publicId);

    if (!board.publicShowAttachments) {
      throw 'pathNotFound';
    }

    const attachment = await Attachment.findOne(inputs.id);
    const card = attachment && (await Card.findOne({ id: attachment.cardId, boardId: board.id }));

    if (!card) {
      throw 'pathNotFound';
    }

    return attachment;
  },
};
