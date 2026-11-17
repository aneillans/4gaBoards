// URL of an instance branding file, versioned so browsers pick up a replaced file; null when not provided

module.exports = {
  sync: true,

  inputs: {
    name: {
      type: 'string',
      required: true,
    },
  },

  fn(inputs) {
    const file = sails.helpers.utils.getBrandingFile(inputs.name);

    return file ? `${sails.config.custom.baseUrl}/branding/${inputs.name}?v=${file.version}` : null;
  },
};
