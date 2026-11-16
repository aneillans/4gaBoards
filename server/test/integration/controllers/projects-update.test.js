const { expect } = require('chai');

const request = (url, { method = 'GET', data, accessToken } = {}) =>
  new Promise((resolve) => {
    sails.request({ url, method, data, headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} }, (error, response, body) => {
      resolve({ status: error ? error.status : response.statusCode, body: error ? error.body : body });
    });
  });

describe('projects/update (controller)', () => {
  let manager;
  let member;
  let project;
  let managerToken;
  let memberToken;
  let createAction;
  let recordedActions;

  before(async () => {
    manager = await User.create({ id: '8001', email: 'manager@test.test', password: 'test', name: 'Manager', username: 'manager', createdById: '0' }).fetch();
    member = await User.create({ id: '8002', email: 'member@test.test', password: 'test', name: 'Member', username: 'member2', createdById: '0' }).fetch();
    project = await Project.create({ id: '8101', name: 'Project', createdById: manager.id }).fetch();
    await ProjectManager.create({ id: '8201', projectId: project.id, userId: manager.id, createdById: manager.id });

    managerToken = sails.helpers.utils.createToken(manager.id);
    memberToken = sails.helpers.utils.createToken(member.id);
    await Session.create({ id: '8301', accessToken: managerToken, remoteAddress: '127.0.0.1', userId: manager.id });
    await Session.create({ id: '8302', accessToken: memberToken, remoteAddress: '127.0.0.1', userId: member.id });

    // sails-disk generates numeric ids, which the activity record created on every project update
    // rejects as a string-pk association. Capture the activity values instead.
    createAction = sails.helpers.actions.createOne;
    sails.helpers.actions.createOne = {
      with: async ({ values }) => {
        recordedActions.push(values);
      },
    };
  });

  beforeEach(() => {
    recordedActions = [];
  });

  after(async () => {
    sails.helpers.actions.createOne = createAction;

    await Session.destroy({ userId: [manager.id, member.id] });
    await ProjectManager.destroy({ projectId: project.id });
    await Project.destroy({ id: project.id });
    await User.destroy({ id: [manager.id, member.id] });
  });

  it('lets a project manager set a trimmed description and records the change', async () => {
    const { status, body } = await request(`/api/projects/${project.id}`, { method: 'PATCH', data: { description: '  Roadmap for 2027\nand beyond  ' }, accessToken: managerToken });

    expect(status).to.equal(200);
    expect(body.item.description).to.equal('Roadmap for 2027\nand beyond');
    expect(recordedActions).to.have.lengthOf(1);
    expect(recordedActions[0].data.projectDescriptionUpdated).to.equal(true);
  });

  it('stores an empty description as null', async () => {
    const { body } = await request(`/api/projects/${project.id}`, { method: 'PATCH', data: { description: '   ' }, accessToken: managerToken });

    expect(body.item.description).to.equal(null);
  });

  it('does not flag a description change when only the name changes', async () => {
    await request(`/api/projects/${project.id}`, { method: 'PATCH', data: { name: 'Renamed' }, accessToken: managerToken });

    expect(recordedActions[0].data.projectDescriptionUpdated).to.equal(undefined);
  });

  it('rejects descriptions over 4096 characters', async () => {
    const { status } = await request(`/api/projects/${project.id}`, { method: 'PATCH', data: { description: 'x'.repeat(4097) }, accessToken: managerToken });

    expect(status).to.equal(400);
  });

  it('does not let a user who is not a project manager change the description', async () => {
    const { status } = await request(`/api/projects/${project.id}`, { method: 'PATCH', data: { description: 'Hijacked' }, accessToken: memberToken });

    expect(status).to.equal(404);
    expect((await Project.findOne(project.id)).description).to.not.equal('Hijacked');
  });
});
