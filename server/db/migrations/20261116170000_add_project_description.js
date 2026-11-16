module.exports.up = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.text('description');
  });
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('project', (table) => {
    table.dropColumn('description');
  });
};
