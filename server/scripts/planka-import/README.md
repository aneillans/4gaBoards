# Planka v2 importer

Copies a Planka v2 instance into 4ga Boards. It can be run again at any time, so people can keep
using Planka until they are ready to move:

- New Planka rows are created in 4ga.
- Rows changed in Planka since the last run are updated in 4ga. Planka wins.
- Unchanged rows are left alone.
- Rows deleted in Planka are only reported. Nothing is deleted in 4ga.

Every Planka row is kept, whole, in `planka_import_record.raw`, including the parts 4ga has nowhere
to show yet (project favourites, custom field definitions, card types, list colours, board view
settings, notification services, webhooks). Passwords, API keys and webhook tokens are never stored.

## What maps to what

| Planka | 4ga |
|---|---|
| Users | Matched to existing accounts by Keycloak subject, then email, then username, and never overwritten. Otherwise created, with avatar and OIDC link. |
| Projects | Name, description, gradient or image background, managers |
| Boards | Name, position, memberships (role, can comment), subscriptions, public link and options. Each board gets its archive and trash lists. |
| Lists | Active lists. Closed lists become done lists. Archive and trash map onto the board's own. |
| Labels | Planka colour names become their hex colours. Colour-only labels are named after the colour. |
| Cards | All fields, done state, restore target, list change time, comment count, cover. Custom field values are added to the description. |
| Task lists, tasks | Including show on front, hide completed and the assignee |
| Attachments | Files copied through 4ga's own processing, so thumbnails are made |
| Comments, activity | Original authors and timestamps. Planka's six activity types map onto 4ga's. |

## Running

The importer runs from the 4ga server directory, with the usual 4ga environment (`DATABASE_URL`
and so on):

```
node scripts/planka-import \
  --planka-db postgres://planka@host/planka \
  --planka-data /planka/data \
  --as admin@example.com \
  --report /tmp/planka-import.json
```

- `--planka-db`: Planka's database. It is only ever read, inside a read-only transaction.
- `--planka-data`: Planka's data directory (the one holding `private/` and `protected/`). Mount it
  read-only; the importer never writes to it.
- `--as`: the 4ga user the import is recorded as (defaults to the first admin).
- `--dry-run`: counts new, already imported and deleted rows without writing anything.

Start with `--dry-run`. The first real run takes about a minute per few thousand cards; later runs
only touch what changed. Attachments whose files are missing are skipped and retried on the next
run, so a run without files followed by one with them works. Avatars and backgrounds also fall back
to the largest size Planka kept when an original is missing.

## Running and re-running on Kubernetes

`k8s-import.sh` does the whole thing against a running 4ga pod, from any machine with `kubectl`
access to both namespaces:

```
server/scripts/planka-import/k8s-import.sh --dry-run   # see what is new or deleted in Planka
server/scripts/planka-import/k8s-import.sh             # copy Planka's files in and import
```

It:

1. Copies Planka's data directory into the 4ga pod (`/tmp/planka-data`), one attachment folder at a
   time. Long single streams through the API server tend to drop, so it retries until every file
   matches Planka's by size, then checks them all by checksum. Folders already copied are skipped.
2. Runs the importer in the pod, passing Planka's database URL over stdin from Planka's configmap.
   The URL never appears in a command line or log.

Planka is only read. The defaults match this cluster (`planka` and `boards` namespaces); see the top
of the script for the settings that can be overridden, including `IMPORT_AS` to record the import as
a particular 4ga user.

Re-run it whenever people have done more work in Planka. Each run copies only what is new and
imports only what changed, and it lists anything deleted in Planka without touching it in 4ga. Check
that list and delete those items in 4ga by hand if that was intended. The full report is left in the
pod at `/tmp/planka-import-report.json`.

Requirements:

- The 4ga pod must be able to write its attachment, avatar and background volumes. The pod needs
  `fsGroup: 1000` when the image runs as the `node` user.
- The 4ga image must include this importer.
- The staged copy uses about as much space as Planka's data directory (about 1 GB here) in the pod's
  own filesystem. It is kept between runs and goes away when the pod restarts.
