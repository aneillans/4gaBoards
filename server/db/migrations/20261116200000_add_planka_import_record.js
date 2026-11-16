// Bookkeeping for the re-runnable Planka importer: one row per Planka row, holding the 4ga record it
// became, a hash of the source row to detect changes, and the full source row so nothing from Planka
// is ever lost, even where 4ga has no place to show it yet.

module.exports.up = async (knex) => {
  await knex.schema.createTable('planka_import_record', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

    table.text('source_table').notNullable();
    table.text('source_id').notNullable();
    table.text('target_table');
    table.bigInteger('target_id');
    // True when the Planka row was matched to a record that already existed in 4ga (an existing
    // account, a board's archive list), which the importer must never overwrite
    table.boolean('is_linked').notNullable().defaultTo(false);
    table.text('source_hash').notNullable();
    table.jsonb('raw').notNullable();
    table.timestamp('deleted_in_source_at', true);

    // created_at is the first import of the row, updated_at the last run that saw it
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    table.unique(['source_table', 'source_id']);
    table.index(['target_table', 'target_id']);
  });
};

module.exports.down = async (knex) => {
  await knex.schema.dropTable('planka_import_record');
};
