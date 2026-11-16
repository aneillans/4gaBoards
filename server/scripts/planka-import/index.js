#!/usr/bin/env node
// Planka v2 -> 4ga Boards importer. Safe to run again at any time; see importer.js for the rules.
//
//   node scripts/planka-import --planka-db postgres://... --planka-data /planka/data --as admin@example.com [--dry-run] [--report report.json]
//
// --planka-db    Planka database URL (or PLANKA_DATABASE_URL). Read in a read-only transaction.
// --planka-data  Planka's data directory (the one holding private/ and protected/), mounted read-only
// --as           4ga user the import runs as (defaults to the first admin)
// --oidc-issuer  Prefer identities from this issuer when matching users (defaults to OIDC_ISSUER_URL)
// --dry-run      Report what would happen without writing anything
// --report       Also write the full report as JSON to this file

const fs = require('fs');

const runImport = require('./importer');
const readPlanka = require('./reader');

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
};

const loadSails = () =>
  new Promise((resolve, reject) => {
    // eslint-disable-next-line global-require
    const sails = require('sails');
    // eslint-disable-next-line global-require
    const rc = require('sails/accessible/rc');

    const config = rc('sails');

    sails.load(
      {
        ...config,
        log: { level: 'warn' },
        // Keep the app's own hook settings (.sailsrc) and switch off the scheduled jobs
        hooks: {
          ...config.hooks,
          'cron-trash-auto-empty': false,
          'cron-notifications-batching': false,
          'cron-expired-sessions-cleanup': false,
          'cron-failed-auths-cleanup': false,
          metrics: false,
        },
      },
      (error) => (error ? reject(error) : resolve(sails)),
    );
  });

const printReport = (report, dryRun) => {
  /* eslint-disable no-console */
  console.log(`\nPlanka import ${dryRun ? '(dry run) ' : ''}summary`);
  Object.entries(report.tables)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([table, outcomes]) => {
      console.log(
        `  ${table.padEnd(26)} ${Object.entries(outcomes)
          .map(([outcome, total]) => `${outcome}: ${total}`)
          .join(', ')}`,
      );
    });

  if (report.deletedInPlanka.length > 0) {
    console.log(`\nDeleted in Planka since an earlier import (left untouched in 4ga): ${report.deletedInPlanka.length}`);
    report.deletedInPlanka.slice(0, 50).forEach((item) => console.log(`  ${item.table} ${item.id} -> ${item.targetTable || 'archive only'} ${item.targetId || ''}`));
  }
  if (report.missingFiles.length > 0) {
    console.log(`\nFiles missing from the Planka data directory: ${report.missingFiles.length}`);
    report.missingFiles.slice(0, 50).forEach((item) => console.log(`  ${item}`));
  }
  if (report.warnings.length > 0) {
    console.log('\nWarnings');
    report.warnings.forEach((item) => console.log(`  ${item}`));
  }
  /* eslint-enable no-console */
};

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const plankaDb = args['planka-db'] || process.env.PLANKA_DATABASE_URL;
  const dryRun = !!args['dry-run'];

  if (!plankaDb) {
    throw new Error('--planka-db (or PLANKA_DATABASE_URL) is required');
  }
  if (!args['planka-data'] && !dryRun) {
    throw new Error('--planka-data is required, so attachments, avatars and backgrounds can be copied');
  }

  const snapshot = await readPlanka(plankaDb);
  const sails = await loadSails();

  try {
    const currentUser = args.as
      ? await User.findOne({ or: [{ email: String(args.as).toLowerCase() }, { username: String(args.as).toLowerCase() }] })
      : (await User.find({ isAdmin: true, deletedAt: null }).sort('createdAt ASC').limit(1))[0];

    if (!currentUser) {
      throw new Error(args.as ? `No 4ga user ${args.as}` : 'No 4ga admin user to run the import as');
    }

    const report = await runImport({
      snapshot,
      dataPath: args['planka-data'],
      currentUser,
      dryRun,
      oidcIssuer: args['oidc-issuer'] || process.env.OIDC_ISSUER_URL,
      log: (message) => sails.log.info(message),
    });

    printReport(report, dryRun);
    if (args.report) {
      fs.writeFileSync(args.report, JSON.stringify(report, null, 2));
    }
  } finally {
    await new Promise((resolve) => {
      sails.lower(resolve);
    });
  }
})().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
