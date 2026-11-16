const { expect } = require('chai');

const request = (url, { method = 'GET', data, accessToken } = {}) =>
  new Promise((resolve) => {
    sails.request({ url, method, data, headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} }, (error, response, body) => {
      resolve({ status: error ? error.status : response.statusCode, body: error ? error.body : body });
    });
  });

describe('task lists', () => {
  let editor;
  let viewer;
  let project;
  let board;
  let list;
  let card;
  let otherCard;
  let emptyCard;
  let checklist;
  let shopping;
  let foreignList;
  let editorToken;
  let viewerToken;
  let createAction;
  let nextTaskId = 6800;

  // String ids, since sails-disk would generate numeric ones the controllers cannot look up
  const createTask = async (values) => {
    nextTaskId += 1;

    return Task.create({ id: String(nextTaskId), position: nextTaskId, name: `Task ${nextTaskId}`, isCompleted: false, cardId: card.id, createdById: editor.id, ...values }).fetch();
  };

  before(async () => {
    editor = await User.create({ id: '6001', email: 'tl-editor@test.test', password: 'test', name: 'Editor', username: 'tleditor', createdById: '0' }).fetch();
    viewer = await User.create({ id: '6002', email: 'tl-viewer@test.test', password: 'test', name: 'Viewer', username: 'tlviewer', createdById: '0' }).fetch();
    project = await Project.create({ id: '6101', name: 'Project', createdById: editor.id }).fetch();
    board = await Board.create({ id: '6201', position: 1, name: 'Board', isGithubConnected: false, isImportedBoard: false, projectId: project.id, createdById: editor.id }).fetch();
    await BoardMembership.create({ id: '6301', role: 'editor', boardId: board.id, userId: editor.id, createdById: editor.id });
    await BoardMembership.create({ id: '6302', role: 'viewer', boardId: board.id, userId: viewer.id, createdById: editor.id });
    list = await List.create({ id: '6401', position: 1, name: 'To do', isCollapsed: false, boardId: board.id, createdById: editor.id }).fetch();

    const cardValues = { commentCount: 0, isCreatedViaApi: false, isCompleted: false, boardId: board.id, listId: list.id, createdById: editor.id };
    card = await Card.create({ id: '6501', position: 1, name: 'Card', ...cardValues }).fetch();
    otherCard = await Card.create({ id: '6502', position: 2, name: 'Other', ...cardValues }).fetch();
    emptyCard = await Card.create({ id: '6503', position: 3, name: 'Empty', ...cardValues }).fetch();

    // String ids, since sails-disk would generate numeric ones that task associations reject
    checklist = await TaskList.create({ id: '6601', cardId: card.id, position: 65535, name: 'Checklist', createdById: editor.id }).fetch();
    shopping = await TaskList.create({ id: '6602', cardId: card.id, position: 131070, name: 'Shopping', createdById: editor.id }).fetch();
    foreignList = await TaskList.create({ id: '6603', cardId: otherCard.id, position: 65535, name: 'Elsewhere', createdById: editor.id }).fetch();

    editorToken = sails.helpers.utils.createToken(editor.id);
    viewerToken = sails.helpers.utils.createToken(viewer.id);
    await Session.create({ id: '6701', accessToken: editorToken, remoteAddress: '127.0.0.1', userId: editor.id });
    await Session.create({ id: '6702', accessToken: viewerToken, remoteAddress: '127.0.0.1', userId: viewer.id });

    // Activity creation is not under test, and sails-disk ids break its associations
    createAction = sails.helpers.actions.createOne;
    sails.helpers.actions.createOne = { with: async () => undefined };
  });

  after(async () => {
    sails.helpers.actions.createOne = createAction;

    await Task.destroy({ cardId: [card.id, otherCard.id, emptyCard.id] });
    await TaskList.destroy({ cardId: [card.id, otherCard.id, emptyCard.id] });
    await Card.destroy({ boardId: board.id });
    await List.destroy({ boardId: board.id });
    await Session.destroy({ userId: [editor.id, viewer.id] });
    await BoardMembership.destroy({ boardId: board.id });
    await Board.destroy({ id: board.id });
    await Project.destroy({ id: project.id });
    await User.destroy({ id: [editor.id, viewer.id] });
  });

  describe('POST /api/cards/:cardId/tasks', () => {
    it('puts a task without a list into the first list of the card', async () => {
      const { status, body } = await request(`/api/cards/${card.id}/tasks`, { method: 'POST', data: { name: 'First' }, accessToken: editorToken });

      expect(status).to.equal(200);
      expect(body.item.taskListId).to.equal(checklist.id);
    });

    it('puts a task into the requested list and positions it among that list only', async () => {
      const first = await request(`/api/cards/${card.id}/tasks`, { method: 'POST', data: { name: 'Milk', taskListId: shopping.id }, accessToken: editorToken });
      const second = await request(`/api/cards/${card.id}/tasks`, { method: 'POST', data: { name: 'Eggs', taskListId: shopping.id }, accessToken: editorToken });

      expect(first.body.item.taskListId).to.equal(shopping.id);
      expect(second.body.item.position).to.be.above(first.body.item.position);
    });

    it('refuses a task list from another card', async () => {
      const { status } = await request(`/api/cards/${card.id}/tasks`, { method: 'POST', data: { name: 'Sneaky', taskListId: foreignList.id }, accessToken: editorToken });

      expect(status).to.equal(403);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('moves a task to another list of the same card, at the end of it', async () => {
      await createTask({ taskListId: shopping.id, position: 900000 });
      const mover = await createTask({ taskListId: checklist.id, position: 1 });

      const { status, body } = await request(`/api/tasks/${mover.id}`, { method: 'PATCH', data: { taskListId: shopping.id }, accessToken: editorToken });
      const lastInShopping = await Task.find({ taskListId: shopping.id, id: { '!=': mover.id } })
        .sort('position DESC')
        .limit(1);

      expect(status).to.equal(200);
      expect(body.item.taskListId).to.equal(shopping.id);
      expect(body.item.position).to.be.above(lastInShopping[0].position);
    });

    it('refuses to move a task to a list on another card', async () => {
      const stayer = await createTask({ taskListId: checklist.id });

      const { status } = await request(`/api/tasks/${stayer.id}`, { method: 'PATCH', data: { taskListId: foreignList.id }, accessToken: editorToken });

      expect(status).to.equal(403);
    });
  });

  describe('task list endpoints', () => {
    it('lets an editor create a task list with its options', async () => {
      const { status, body } = await request(`/api/cards/${emptyCard.id}/task-lists`, { method: 'POST', data: { name: 'Steps', showOnFrontOfCard: false, hideCompletedTasks: true }, accessToken: editorToken });

      expect(status).to.equal(200);
      expect(body.item).to.include({ name: 'Steps', showOnFrontOfCard: false, hideCompletedTasks: true, cardId: emptyCard.id });
    });

    it('does not let a viewer create, rename or delete task lists', async () => {
      expect((await request(`/api/cards/${card.id}/task-lists`, { method: 'POST', data: { name: 'Nope' }, accessToken: viewerToken })).status).to.equal(403);
      expect((await request(`/api/task-lists/${checklist.id}`, { method: 'PATCH', data: { name: 'Nope' }, accessToken: viewerToken })).status).to.equal(403);
      expect((await request(`/api/task-lists/${checklist.id}`, { method: 'DELETE', accessToken: viewerToken })).status).to.equal(403);
    });

    it('updates the name and options of a task list', async () => {
      const { body } = await request(`/api/task-lists/${checklist.id}`, { method: 'PATCH', data: { name: 'Checklist v2', showOnFrontOfCard: false, hideCompletedTasks: true }, accessToken: editorToken });

      expect(body.item).to.include({ name: 'Checklist v2', showOnFrontOfCard: false, hideCompletedTasks: true });
    });

    it('deletes a task list together with its tasks', async () => {
      const doomed = await TaskList.create({ id: '6604', cardId: card.id, position: 196605, name: 'Doomed', createdById: editor.id }).fetch();
      await createTask({ taskListId: doomed.id });

      const { status } = await request(`/api/task-lists/${doomed.id}`, { method: 'DELETE', accessToken: editorToken });

      expect(status).to.equal(200);
      expect(await TaskList.findOne(doomed.id)).to.equal(undefined);
      expect(await Task.count({ taskListId: doomed.id })).to.equal(0);
    });
  });

  describe('taskLists.getOrCreateDefault', () => {
    it('returns the first list of a card that has lists', async () => {
      const taskList = await sails.helpers.taskLists.getOrCreateDefault.with({ card, currentUser: editor });

      expect(taskList.id).to.equal(checklist.id);
    });

    it('creates a default list for a card without any', async () => {
      const bare = await Card.create({ id: '6504', position: 4, name: 'Bare', commentCount: 0, isCreatedViaApi: false, isCompleted: false, boardId: board.id, listId: list.id, createdById: editor.id }).fetch();

      const taskList = await sails.helpers.taskLists.getOrCreateDefault.with({ card: bare, currentUser: editor });

      expect(taskList.name).to.equal('common.tasks');
      expect(await TaskList.count({ cardId: bare.id })).to.equal(1);
      await TaskList.destroy({ cardId: bare.id });
    });
  });
});
