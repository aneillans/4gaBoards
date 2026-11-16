const fs = require('fs');
const path = require('path');

const Errors = {
  ATTACHMENT_NOT_FOUND: {
    attachmentNotFound: 'Attachment not found',
  },
};

module.exports = {
  inputs: {
    publicId: {
      type: 'string',
      required: true,
    },
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
  },

  exits: {
    attachmentNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs, exits) {
    const attachment = await sails.helpers.attachments.getOneForPublic(inputs.publicId, inputs.id).intercept('pathNotFound', () => Errors.ATTACHMENT_NOT_FOUND);

    const filePath = path.join(sails.config.custom.attachmentsPath, attachment.dirname, attachment.filename);

    if (!fs.existsSync(filePath)) {
      throw Errors.ATTACHMENT_NOT_FOUND;
    }

    this.res.type(attachment.filename);
    if (!attachment.image && path.extname(attachment.filename) !== '.pdf') {
      this.res.set('Content-Disposition', 'attachment');
    }
    this.res.set('Cache-Control', `private, max-age=${sails.config.custom.cacheMaxAge}`);

    return exits.success(fs.createReadStream(filePath));
  },
};
