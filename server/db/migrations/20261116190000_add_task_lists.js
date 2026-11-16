// Planka-style task lists: a card holds any number of named task lists, each of which can be shown
// on the front of the card and can hide its completed tasks. Existing tasks move into one list per
// card. task.card_id stays, so everything that reads tasks by card keeps working.

module.exports.up = async (knex) => {
  await knex.transaction(async (trx) => {
    await trx.schema.createTable('task_list', (table) => {
      table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));

      table.bigInteger('card_id').notNullable();

      table.specificType('position', 'double precision').notNullable();
      table.text('name').notNullable();
      table.boolean('show_on_front_of_card').notNullable().defaultTo(true);
      table.boolean('hide_completed_tasks').notNullable().defaultTo(false);

      table.timestamp('created_at', true);
      table.timestamp('updated_at', true);
      table.bigInteger('created_by_id').notNullable();
      table.bigInteger('updated_by_id');

      table.index('card_id');
      table.index('position');
    });

    await trx.schema.alterTable('task', (table) => {
      table.bigInteger('task_list_id');
      table.index('task_list_id');
    });

    await trx.raw(`
      INSERT INTO task_list (card_id, position, name, show_on_front_of_card, hide_completed_tasks, created_at, created_by_id)
      SELECT card.id, 65535, 'common.tasks', true, false, NOW(), card.created_by_id
      FROM card
      WHERE EXISTS (SELECT 1 FROM task WHERE task.card_id = card.id)
    `);

    await trx.raw('UPDATE task SET task_list_id = task_list.id FROM task_list WHERE task_list.card_id = task.card_id');
  });
};

module.exports.down = async (knex) => {
  await knex.transaction(async (trx) => {
    await trx.schema.alterTable('task', (table) => {
      table.dropColumn('task_list_id');
    });

    await trx.schema.dropTable('task_list');
  });
};
