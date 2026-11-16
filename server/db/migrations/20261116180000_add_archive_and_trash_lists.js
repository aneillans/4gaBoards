// Planka-style archive and trash: every board gets exactly one list of each, hidden from the normal
// board views. Cards remember the list they came from so they can be restored, and when they last
// changed list so the trash can be emptied automatically after a per-board number of days.

module.exports.up = async (knex) => {
  await knex.transaction(async (trx) => {
    await trx.schema.alterTable('list', (table) => {
      table.text('type').notNullable().defaultTo('active');
    });

    await trx.schema.alterTable('card', (table) => {
      table.bigInteger('prev_list_id');
      table.timestamp('list_changed_at', true);
    });

    await trx.schema.alterTable('board', (table) => {
      table.integer('trash_auto_empty_days');
    });

    await trx.raw(`
      INSERT INTO list (board_id, type, position, name, is_collapsed, is_completed, created_at, created_by_id)
      SELECT board.id, special.type, 0, special.name, false, false, NOW(), board.created_by_id
      FROM board
      CROSS JOIN (VALUES ('archive', 'common.archive'), ('trash', 'common.trash')) AS special (type, name)
    `);

    await trx.raw("CREATE UNIQUE INDEX list_board_id_special_type_unique ON list (board_id, type) WHERE type IN ('archive', 'trash')");
    await trx.raw('CREATE INDEX card_list_changed_at_index ON card (list_changed_at)');
  });
};

module.exports.down = async (knex) => {
  await knex.transaction(async (trx) => {
    // Cards in archive or trash go back to the list they came from, or are deleted with their list
    await trx.raw(`
      UPDATE card SET list_id = card.prev_list_id
      FROM list
      WHERE card.list_id = list.id AND list.type IN ('archive', 'trash') AND card.prev_list_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM list AS prev WHERE prev.id = card.prev_list_id AND prev.type = 'active')
    `);
    await trx.raw("DELETE FROM card USING list WHERE card.list_id = list.id AND list.type IN ('archive', 'trash')");
    await trx.raw("DELETE FROM list WHERE type IN ('archive', 'trash')");

    await trx.raw('DROP INDEX IF EXISTS list_board_id_special_type_unique');
    await trx.raw('DROP INDEX IF EXISTS card_list_changed_at_index');

    await trx.schema.alterTable('board', (table) => {
      table.dropColumn('trash_auto_empty_days');
    });

    await trx.schema.alterTable('card', (table) => {
      table.dropColumn('prev_list_id');
      table.dropColumn('list_changed_at');
    });

    await trx.schema.alterTable('list', (table) => {
      table.dropColumn('type');
    });
  });
};
