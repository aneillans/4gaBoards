const fs = require('fs');
const path = require('path');

// Instance branding files, all optional, read from BRANDING_PATH:
//   logo.(svg|png|webp)  full logo on the login and register pages, shown on a dark background
//   icon.(svg|png|webp)  square icon: header, browser tab and installed app icons
//   favicon.ico          browser tab icon; icon.* is used when it is missing
const EXTENSIONS = {
  logo: ['svg', 'png', 'webp'],
  icon: ['svg', 'png', 'webp'],
  favicon: ['ico'],
};

module.exports = {
  sync: true,

  inputs: {
    name: {
      type: 'string',
      required: true,
    },
  },

  fn(inputs) {
    const dir = sails.config.custom.brandingPath;

    if (!dir || !EXTENSIONS[inputs.name]) {
      return null;
    }

    // eslint-disable-next-line no-restricted-syntax
    for (const extension of EXTENSIONS[inputs.name]) {
      const filePath = path.join(dir, `${inputs.name}.${extension}`);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isFile()) {
          return { path: filePath, extension, version: Math.floor(stat.mtimeMs) };
        }
      } catch {
        // not provided
      }
    }

    return null;
  },
};
