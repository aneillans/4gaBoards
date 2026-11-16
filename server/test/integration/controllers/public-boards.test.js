const { expect } = require('chai');

const request = (url, { method = 'GET', data, accessToken } = {}) =>
  new Promise((resolve) => {
    sails.request({ url, method, data, headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} }, (error, response, body) => {
      resolve({ status: error ? error.status : response.statusCode, body: error ? error.body : body });
    });
  });

describe('public-boards (controller)', () => {
  let user;
  let otherUser;
  let managerToken;
  let memberToken;
  let project;
  let board;
  let privateBoard;
  let card;
  let privateCard;

  const setFlags = async (values) => {
    board = await Board.updateOne(board.id).set(values);
  };

  before(async () => {
    user = await User.create({ id: '9001', email: 'public@test.test', password: 'test', name: 'Member', username: 'member', createdById: '0' }).fetch();
    otherUser = await User.create({ id: '9002', email: 'other@test.test', password: 'test', name: 'Other', username: 'other', createdById: '0' }).fetch();
    project = await Project.create({ id: '9101', name: 'Project', createdById: user.id }).fetch();
    await ProjectManager.create({ id: '9901', projectId: project.id, userId: user.id, createdById: user.id });

    managerToken = sails.helpers.utils.createToken(user.id);
    memberToken = sails.helpers.utils.createToken(otherUser.id);
    await Session.create({ id: '9951', accessToken: managerToken, remoteAddress: '127.0.0.1', userId: user.id });
    await Session.create({ id: '9952', accessToken: memberToken, remoteAddress: '127.0.0.1', userId: otherUser.id });

    board = await Board.create({
      id: '9201',
      position: 1,
      name: 'Public',
      isGithubConnected: true,
      githubRepo: 'secret/repo',
      isImportedBoard: false,
      isPublic: true,
      publicId: 'public-id-for-tests',
      projectId: project.id,
      createdById: user.id,
    }).fetch();
    privateBoard = await Board.create({
      id: '9202',
      position: 2,
      name: 'Private',
      isGithubConnected: false,
      isImportedBoard: false,
      isPublic: false,
      publicId: 'stale-public-id',
      projectId: project.id,
      createdById: user.id,
    }).fetch();

    await BoardMembership.create({ id: '9301', role: 'editor', boardId: board.id, userId: user.id, createdById: user.id });
    await BoardMembership.create({ id: '9302', role: 'editor', boardId: privateBoard.id, userId: otherUser.id, createdById: user.id });

    const list = await List.create({ id: '9401', position: 1, name: 'List', isCollapsed: false, boardId: board.id, createdById: user.id }).fetch();
    const privateList = await List.create({ id: '9402', position: 1, name: 'List', isCollapsed: false, boardId: privateBoard.id, createdById: user.id }).fetch();

    card = await Card.create({
      id: '9501',
      position: 1,
      name: 'Card',
      commentCount: 1,
      isCreatedViaApi: false,
      mailCreatorAddress: 'someone@test.test',
      boardId: board.id,
      listId: list.id,
      createdById: user.id,
    }).fetch();
    privateCard = await Card.create({ id: '9502', position: 1, name: 'Card', commentCount: 0, isCreatedViaApi: false, boardId: privateBoard.id, listId: privateList.id, createdById: user.id }).fetch();

    await Comment.create({ id: '9601', data: { text: 'hidden comment' }, cardId: card.id, userId: user.id, createdById: user.id });
    await Attachment.create({ id: '9701', dirname: 'dir', filename: 'file.txt', name: 'file.txt', cardId: card.id, createdById: user.id });

    const path = { projectId: project.id, boardId: board.id, listId: list.id, cardId: card.id, userId: user.id, createdById: user.id };
    await Action.create({ ...path, id: '9801', scope: Action.Scopes.CARD, type: Action.Types.CARD_CREATE, data: { cardName: 'Card' } });
    await Action.create({ ...path, id: '9802', scope: Action.Scopes.COMMENT, type: Action.Types.CARD_COMMENT_CREATE, data: { commentText: 'hidden comment' } });
    await Action.create({ ...path, id: '9803', scope: Action.Scopes.BOARD, type: Action.Types.BOARD_UPDATE, data: { boardName: 'Public', githubRepo: 'secret/repo' } });
  });

  after(async () => {
    await Action.destroy({ projectId: project.id });
    await Session.destroy({ userId: [user.id, otherUser.id] });
    await ProjectManager.destroy({ projectId: project.id });
    await Attachment.destroy({ cardId: card.id });
    await Comment.destroy({ cardId: card.id });
    await Card.destroy({ boardId: [board.id, privateBoard.id] });
    await List.destroy({ boardId: [board.id, privateBoard.id] });
    await BoardMembership.destroy({ boardId: [board.id, privateBoard.id] });
    await Board.destroy({ id: [board.id, privateBoard.id] });
    await Project.destroy({ id: project.id });
    await User.destroy({ id: [user.id, otherUser.id] });
  });

  beforeEach(async () => {
    await setFlags({ isPublic: true, publicShowMembers: false, publicShowComments: false, publicShowActivity: false, publicShowAttachments: false });
  });

  describe('GET /api/public-boards/:publicId', () => {
    it('returns 404 for an unknown public id', async () => {
      const { status } = await request('/api/public-boards/does-not-exist');
      expect(status).to.equal(404);
    });

    it('returns 404 for a board that is not public, even with a stale public id', async () => {
      const { status } = await request('/api/public-boards/stale-public-id');
      expect(status).to.equal(404);
    });

    it('returns a read-only snapshot without private fields', async () => {
      const { status, body } = await request(`/api/public-boards/${board.publicId}`);

      expect(status).to.equal(200);
      expect(body.item.id).to.equal(board.id);
      expect(body.item).to.not.have.property('githubRepo');
      expect(body.item).to.not.have.property('isGithubConnected');
      expect(body.included.cards).to.have.lengthOf(1);
      expect(body.included.cards[0]).to.not.have.property('mailCreatorAddress');
      expect(body.included.cards[0].commentCount).to.equal(0);
      expect(body.included.mailTokens).to.deep.equal([]);
      expect(body.included.users).to.deep.equal([]);
      expect(body.included.boardMemberships).to.deep.equal([]);
      expect(body.included.attachments).to.deep.equal([]);
      expect(body.userPrefs.defaultView).to.equal('board');
      expect(body.userPrefs).to.not.have.property('userId');
    });

    it('includes members with only public user fields when enabled', async () => {
      await setFlags({ publicShowMembers: true });

      const { body } = await request(`/api/public-boards/${board.publicId}`);

      expect(body.included.boardMemberships).to.have.lengthOf(1);
      expect(body.included.users).to.have.lengthOf(1);
      expect(body.included.users[0].name).to.equal('Member');
      expect(body.included.users[0]).to.not.have.property('email');
    });

    it('includes attachments with board-scoped public urls when enabled', async () => {
      await setFlags({ publicShowAttachments: true });

      const { body } = await request(`/api/public-boards/${board.publicId}`);

      expect(body.included.attachments).to.have.lengthOf(1);
      expect(body.included.attachments[0].url).to.contain(`/public-boards/${board.publicId}/attachments/`);
      expect(body.included.attachments[0]).to.not.have.property('dirname');
    });
  });

  describe('GET /api/public-boards/:publicId/cards/:cardId/comments', () => {
    it('returns 404 when comments are not shared', async () => {
      const { status } = await request(`/api/public-boards/${board.publicId}/cards/${card.id}/comments`);
      expect(status).to.equal(404);
    });

    it('returns comments when shared', async () => {
      await setFlags({ publicShowComments: true });

      const { status, body } = await request(`/api/public-boards/${board.publicId}/cards/${card.id}/comments`);

      expect(status).to.equal(200);
      expect(body.items).to.have.lengthOf(1);
      expect(body.included.users[0]).to.not.have.property('email');
    });

    it('returns 404 for a card on another board', async () => {
      await setFlags({ publicShowComments: true });

      const { status } = await request(`/api/public-boards/${board.publicId}/cards/${privateCard.id}/comments`);
      expect(status).to.equal(404);
    });
  });

  describe('GET /api/public-boards/:publicId/actions', () => {
    it('returns 404 when activity is not shared', async () => {
      const { status } = await request(`/api/public-boards/${board.publicId}/actions`);
      expect(status).to.equal(404);
    });

    it('hides comment activity and GitHub details unless comments are shared', async () => {
      await setFlags({ publicShowActivity: true });

      const { status, body } = await request(`/api/public-boards/${board.publicId}/actions`);

      expect(status).to.equal(200);
      expect(body.items.map((item) => item.scope)).to.have.members([Action.Scopes.CARD, Action.Scopes.BOARD]);
      expect(body.items.find((item) => item.scope === Action.Scopes.BOARD).data).to.not.have.property('githubRepo');
    });

    it('includes comment activity when comments are shared', async () => {
      await setFlags({ publicShowActivity: true, publicShowComments: true });

      const { body } = await request(`/api/public-boards/${board.publicId}/cards/${card.id}/actions`);

      expect(body.items.map((item) => item.scope)).to.include(Action.Scopes.COMMENT);
    });
  });

  describe('GET /public-boards/:publicId/attachments/:id/download/:filename', () => {
    it('returns 404 when attachments are not shared', async () => {
      const attachment = await Attachment.findOne({ cardId: card.id });

      const { status } = await request(`/public-boards/${board.publicId}/attachments/${attachment.id}/download/file.txt`);
      expect(status).to.equal(404);
    });
  });

  describe('PATCH /api/boards/:id', () => {
    // sails-disk generates numeric ids, which the activity record created on every board update
    // rejects as a string-pk association. Activity creation is not under test here.
    let createAction;

    before(() => {
      createAction = sails.helpers.actions.createOne;
      sails.helpers.actions.createOne = { with: async () => undefined };
    });

    after(() => {
      sails.helpers.actions.createOne = createAction;
    });

    it('mints a new public id when a project manager publishes a board and clears it when unpublished', async () => {
      const published = await request(`/api/boards/${privateBoard.id}`, { method: 'PATCH', data: { isPublic: true, publicShowAttachments: true }, accessToken: managerToken });

      expect(published.status).to.equal(200);
      expect(published.body.item.isPublic).to.equal(true);
      expect(published.body.item.publicShowAttachments).to.equal(true);
      expect(published.body.item.publicId).to.match(/^[A-Za-z0-9_-]{24}$/);
      expect(published.body.item.publicId).to.not.equal('stale-public-id');

      const unpublished = await request(`/api/boards/${privateBoard.id}`, { method: 'PATCH', data: { isPublic: false }, accessToken: managerToken });

      expect(unpublished.body.item.isPublic).to.equal(false);
      expect(unpublished.body.item.publicId).to.equal(null);

      const { status } = await request(`/api/public-boards/${published.body.item.publicId}`);
      expect(status).to.equal(404);
    });

    it('does not let a board member who is not a project manager publish a board', async () => {
      const { status } = await request(`/api/boards/${privateBoard.id}`, { method: 'PATCH', data: { isPublic: true }, accessToken: memberToken });

      expect(status).to.equal(404);
      expect((await Board.findOne(privateBoard.id)).isPublic).to.equal(false);
    });
  });
});
