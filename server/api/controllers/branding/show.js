const fs = require('fs');

const Errors = {
  FILE_NOT_FOUND: {
    fileNotFound: 'File not found',
  },
};

module.exports = {
  inputs: {
    name: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    fileNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const file = sails.helpers.utils.getBrandingFile(inputs.name);

    if (!file) {
      throw Errors.FILE_NOT_FOUND;
    }

    this.res.type(file.extension);
    this.res.set('Cache-Control', 'public, max-age=86400');

    return fs.createReadStream(file.path);
  },
};
