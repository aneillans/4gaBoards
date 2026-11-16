module.exports.up = async (knex) => {
  await knex.schema.alterTable('board', (table) => {
    table.boolean('is_public').notNullable().defaultTo(false);
    table.text('public_id').unique();
    table.boolean('public_show_members').notNullable().defaultTo(false);
    table.boolean('public_show_comments').notNullable().defaultTo(false);
    table.boolean('public_show_activity').notNullable().defaultTo(false);
    table.boolean('public_show_attachments').notNullable().defaultTo(false);
  });
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('board', (table) => {
    table.dropColumn('is_public');
    table.dropColumn('public_id');
    table.dropColumn('public_show_members');
    table.dropColumn('public_show_comments');
    table.dropColumn('public_show_activity');
    table.dropColumn('public_show_attachments');
  });
};
