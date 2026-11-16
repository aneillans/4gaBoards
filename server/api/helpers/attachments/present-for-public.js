// Points attachment urls at the board-scoped public download routes.

module.exports = {
  sync: true,

  inputs: {
    attachments: {
      type: 'ref',
      required: true,
    },
    publicId: {
      type: 'string',
      required: true,
    },
  },

  fn(inputs) {
    const baseUrl = `${sails.config.custom.baseUrl}/public-boards/${inputs.publicId}/attachments`;

    return inputs.attachments.map((attachment) => ({
      ..._.omit(attachment, ['dirname', 'filename', 'image.thumbnailsExtension']),
      url: `${baseUrl}/${attachment.id}/download/${attachment.filename}`,
      coverUrl: attachment.image ? `${baseUrl}/${attachment.id}/download/thumbnails/cover-256.${attachment.image.thumbnailsExtension}` : null,
    }));
  },
};
