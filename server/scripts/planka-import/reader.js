// Reads a snapshot of a Planka v2 database in one read-only transaction. Planka is never written to.
// Rows come back with camelCase keys. Tables that do not exist in the given Planka version come back
// empty, so older and newer schemas both work.

const initKnex = require('knex');
const _ = require('lodash');

const TABLES = [
  'user_account',
  'identity_provider_user',
  'project',
  'project_manager',
  'project_favorite',
  'background_image',
  'base_custom_field_group',
  'board',
  'board_membership',
  'board_subscription',
  'label',
  'list',
  'card',
  'card_label',
  'card_membership',
  'card_subscription',
  'task_list',
  'task',
  'attachment',
  'comment',
  'action',
  'custom_field_group',
  'custom_field',
  'custom_field_value',
  'notification_service',
  'webhook',
];

const camelizeRow = (row) => _.mapKeys(row, (value, key) => _.camelCase(key));

module.exports = async (connection) => {
  const knex = initKnex({ client: 'pg', connection });

  try {
    return await knex.transaction(
      async (trx) => {
        const existing = new Set((await trx.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((row) => row.table_name));

        const snapshot = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const table of TABLES) {
          // eslint-disable-next-line no-await-in-loop
          snapshot[table] = existing.has(table) ? (await trx.select('*').from(table).orderBy('id')).map(camelizeRow) : [];
        }

        return snapshot;
      },
      { readOnly: true },
    );
  } finally {
    await knex.destroy();
  }
};

module.exports.TABLES = TABLES;
