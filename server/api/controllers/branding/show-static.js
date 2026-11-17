const fs = require('fs');
const path = require('path');

// The favicon, app icons and web app manifest, with the instance branding applied where it is set.
// Without branding these are the files the client build put in public/.

const Errors = {
  FILE_NOT_FOUND: {
    fileNotFound: 'File not found',
  },
};

const publicFile = (fileName) => path.join(sails.config.paths.public, fileName);

module.exports = {
  exits: {
    fileNotFound: {
      responseType: 'notFound',
    },
  },

  async fn() {
    const fileName = path.basename(this.req.path);

    if (fileName === 'manifest.json') {
      let manifest;
      try {
        manifest = JSON.parse(await fs.promises.readFile(publicFile(fileName), 'utf8'));
      } catch {
        throw Errors.FILE_NOT_FOUND;
      }

      return { ...manifest, name: sails.config.custom.appName, short_name: sails.config.custom.appName };
    }

    const file = (fileName === 'favicon.ico' && sails.helpers.utils.getBrandingFile('favicon')) || sails.helpers.utils.getBrandingFile('icon');

    if (file) {
      this.res.type(file.extension);
      this.res.set('Cache-Control', 'no-cache');

      return fs.createReadStream(file.path);
    }

    if (!fs.existsSync(publicFile(fileName))) {
      throw Errors.FILE_NOT_FOUND;
    }

    this.res.type(path.extname(fileName));

    return fs.createReadStream(publicFile(fileName));
  },
};
