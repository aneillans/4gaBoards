/**
 * PlankaImportRecord.js
 *
 * @description :: Maps one Planka row to the 4ga record it became, keeping the raw source row
 */

module.exports = {
  attributes: {
    sourceTable: {
      type: 'string',
      required: true,
      columnName: 'source_table',
    },
    sourceId: {
      type: 'string',
      required: true,
      columnName: 'source_id',
    },
    targetTable: {
      type: 'string',
      allowNull: true,
      columnName: 'target_table',
    },
    targetId: {
      type: 'string',
      allowNull: true,
      columnName: 'target_id',
    },
    isLinked: {
      type: 'boolean',
      defaultsTo: false,
      columnName: 'is_linked',
    },
    sourceHash: {
      type: 'string',
      required: true,
      columnName: 'source_hash',
    },
    raw: {
      type: 'json',
      required: true,
    },
    deletedInSourceAt: {
      type: 'ref',
      columnName: 'deleted_in_source_at',
    },
  },

  tableName: 'planka_import_record',
};
