// The client app page, with the product name in its title and description replaced by APP_NAME

const DEFAULT_APP_NAME = '4ga Boards';

let brandedPage;

const renderIndex = () =>
  new Promise((resolve, reject) => {
    sails.renderView('index', { ...sails.config.views.locals, layout: false }, (error, html) => (error ? reject(error) : resolve(html)));
  });

module.exports = {
  async fn() {
    const { appName } = sails.config.custom;

    if (appName === DEFAULT_APP_NAME) {
      return this.res.view('index');
    }

    if (!brandedPage) {
      brandedPage = (await renderIndex()).split(DEFAULT_APP_NAME).join(_.escape(appName));
    }

    this.res.type('html');

    return this.res.send(brandedPage);
  },
};
