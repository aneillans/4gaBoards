const { expect } = require('chai');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

// Files are streamed, which virtual requests cannot carry, so these go to the lifted server
const fetchFile = (url) =>
  new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${sails.config.port}${url}`, (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, body, headers: response.headers }));
      })
      .on('error', reject);
  });

const request = (url) =>
  new Promise((resolve) => {
    sails.request({ url, method: 'GET' }, (error, response, body) => {
      resolve({ status: error ? error.status : response.statusCode, body: error ? error.body : body, headers: response ? response.headers : {} });
    });
  });

describe('Branding', () => {
  let dir;
  let config;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'branding-'));
    config = { appName: sails.config.custom.appName, brandingPath: sails.config.custom.brandingPath };
  });

  afterEach(() => {
    Object.assign(sails.config.custom, config);
    fs.readdirSync(dir).forEach((file) => fs.unlinkSync(path.join(dir, file)));
  });

  after(() => {
    fs.rmdirSync(dir);
  });

  describe('branding files', () => {
    it('finds a provided logo and gives a versioned URL for it', () => {
      sails.config.custom.brandingPath = dir;
      fs.writeFileSync(path.join(dir, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

      expect(sails.helpers.utils.getBrandingFile('logo').path).to.equal(path.join(dir, 'logo.svg'));
      expect(sails.helpers.utils.getBrandingUrl('logo')).to.match(/\/branding\/logo\?v=\d+$/);
    });

    it('has nothing to offer when no branding folder is set', () => {
      sails.config.custom.brandingPath = undefined;

      expect(sails.helpers.utils.getBrandingFile('logo')).to.equal(null);
      expect(sails.helpers.utils.getBrandingUrl('icon')).to.equal(null);
    });

    it('only serves the known file names', () => {
      sails.config.custom.brandingPath = dir;
      fs.writeFileSync(path.join(dir, 'secret.png'), 'x');

      expect(sails.helpers.utils.getBrandingFile('secret')).to.equal(null);
      expect(sails.helpers.utils.getBrandingFile('../secret')).to.equal(null);
    });

    it('serves a provided icon without signing in', async () => {
      sails.config.custom.brandingPath = dir;
      fs.writeFileSync(path.join(dir, 'icon.png'), 'png-bytes');

      const { status, body, headers } = await fetchFile('/branding/icon');

      expect(status).to.equal(200);
      expect(body).to.equal('png-bytes');
      expect(headers['content-type']).to.contain('image/png');
    });

    it('returns not found for a file that was not provided', async () => {
      sails.config.custom.brandingPath = dir;

      const { status } = await fetchFile('/branding/logo');

      expect(status).to.equal(404);
    });
  });

  describe('core settings', () => {
    before(async () => {
      await Core.create({ id: '0', allowedRegisterDomains: [], createdById: '0' });
    });

    after(async () => {
      await Core.destroy({ id: '0' });
    });

    it('report the product name and branding URLs', async () => {
      sails.config.custom.appName = 'Acme Boards';
      sails.config.custom.brandingPath = dir;
      fs.writeFileSync(path.join(dir, 'icon.png'), 'png-bytes');

      const { body } = await request('/api/core-settings-public');

      expect(body.item.appName).to.equal('Acme Boards');
      expect(body.item.iconUrl).to.match(/\/branding\/icon\?v=\d+$/);
      expect(body.item.logoUrl).to.equal(null);
    });
  });
});
