// The only sanctioned way to expose users to anonymous visitors: an explicit field allowlist.

const PUBLIC_FIELDS = ['id', 'name', 'username', 'avatarUrl', 'deletedAt'];

module.exports = {
  sync: true,

  inputs: {
    users: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    return inputs.users.map((user) => _.pick(user.toJSON ? user.toJSON() : user, PUBLIC_FIELDS));
  },
};
