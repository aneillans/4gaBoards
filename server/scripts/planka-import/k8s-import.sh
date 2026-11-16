#!/usr/bin/env bash
# Runs the Planka importer inside a running 4ga Boards pod on Kubernetes, the way it was first run:
#   1. copies Planka's data directory into the 4ga pod in small batches, retrying until every file
#      matches Planka's by size and finally by checksum (long single streams through the API server
#      tend to drop),
#   2. runs the importer there, passing Planka's database URL over stdin so it never shows up in a
#      command line or log.
# Planka is only ever read. Safe to run as often as needed; see README.md for what a re-run does.
#
# Usage: k8s-import.sh [--dry-run]
#
# Settings, overridable through the environment:
#   PLANKA_NS=planka  PLANKA_DEPLOY=planka  PLANKA_CONTAINER=planka  PLANKA_DATA=/app/data
#   PLANKA_DB_CONFIGMAP=planka  PLANKA_DB_KEY=DATABASE_URL
#   BOARDS_NS=boards  BOARDS_SELECTOR=app=boards  BOARDS_CONTAINER=boards
#   STAGING_DIR=/tmp/planka-data  IMPORT_AS=  (4ga user the import is recorded as; default: first admin)

set -euo pipefail

PLANKA_NS=${PLANKA_NS:-planka}
PLANKA_DEPLOY=${PLANKA_DEPLOY:-planka}
PLANKA_CONTAINER=${PLANKA_CONTAINER:-planka}
PLANKA_DATA=${PLANKA_DATA:-/app/data}
PLANKA_DB_CONFIGMAP=${PLANKA_DB_CONFIGMAP:-planka}
PLANKA_DB_KEY=${PLANKA_DB_KEY:-DATABASE_URL}
BOARDS_NS=${BOARDS_NS:-boards}
BOARDS_SELECTOR=${BOARDS_SELECTOR:-app=boards}
BOARDS_CONTAINER=${BOARDS_CONTAINER:-boards}
STAGING_DIR=${STAGING_DIR:-/tmp/planka-data}
IMPORT_AS=${IMPORT_AS:-}

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

work=$(mktemp -d)
trap 'rm -r "$work"' EXIT

boards_pod=$(kubectl -n "$BOARDS_NS" get pod -l "$BOARDS_SELECTOR" -o jsonpath='{.items[0].metadata.name}')
echo "4ga pod: $boards_pod"

planka() { kubectl -n "$PLANKA_NS" exec "deploy/$PLANKA_DEPLOY" -c "$PLANKA_CONTAINER" -- "$@"; }
boards() { kubectl -n "$BOARDS_NS" exec -i "$boards_pod" -c "$BOARDS_CONTAINER" -- "$@"; }

# "size path" for every file, sorted, on either side
list_files() { "$1" sh -c "cd '$2' 2>/dev/null && find private protected -type f -exec stat -c '%s %n' {} + | sort"; }
# Planka folders still missing or incomplete in the staging copy: attachment folders one by one,
# protected/ as a whole
folders_to_copy() { comm -23 "$work/planka.txt" "$work/pod.txt" | awk '{print $2}' | awk -F/ '{ if ($1 == "protected") print $1; else print $1 "/" $2 "/" $3 }' | sort -u; }

if [[ "$DRY_RUN" == false ]]; then
  echo "Copying Planka data into $boards_pod:$STAGING_DIR"
  boards mkdir -p "$STAGING_DIR"
  list_files planka "$PLANKA_DATA" > "$work/planka.txt"

  for attempt in 1 2 3 4 5 6; do
    list_files boards "$STAGING_DIR" > "$work/pod.txt" || true
    folders_to_copy > "$work/todo.txt"
    [[ -s "$work/todo.txt" ]] || break
    echo "  attempt $attempt: $(wc -l < "$work/todo.txt") folder(s) to copy"
    while read -r folder; do
      planka tar -C "$PLANKA_DATA" -cf - "$folder" 2>/dev/null | boards tar -xf - -C "$STAGING_DIR" 2>/dev/null || true
    done < "$work/todo.txt"
  done

  list_files boards "$STAGING_DIR" > "$work/pod.txt"
  if [[ -n "$(folders_to_copy)" ]]; then
    echo "Some files still differ after several attempts; run the script again." >&2
    exit 1
  fi

  echo "Verifying checksums"
  planka sh -c "cd '$PLANKA_DATA' && find private protected -type f -exec sha256sum {} +" | sort -k2 > "$work/planka.sum"
  boards sh -c "cd '$STAGING_DIR' && find private protected -type f -exec sha256sum {} +" | sort -k2 > "$work/pod.sum"
  diff -q "$work/planka.sum" "$work/pod.sum" > /dev/null || { echo "Checksums differ; run the script again." >&2; exit 1; }
  echo "  $(wc -l < "$work/pod.sum") files identical"
fi

args=(--report /tmp/planka-import-report.json)
[[ "$DRY_RUN" == true ]] && args+=(--dry-run) || args+=(--planka-data "$STAGING_DIR")
[[ -n "$IMPORT_AS" ]] && args+=(--as "$IMPORT_AS")

if [[ "$DRY_RUN" == true ]]; then echo "Running the importer (dry run)"; else echo "Running the importer"; fi
kubectl -n "$PLANKA_NS" get configmap "$PLANKA_DB_CONFIGMAP" -o "jsonpath={.data.$PLANKA_DB_KEY}" \
  | boards sh -c 'read -r PLANKA_DATABASE_URL; export PLANKA_DATABASE_URL; cd /app && exec node scripts/planka-import "$@"' importer "${args[@]}"

echo
echo "Full report: $boards_pod:/tmp/planka-import-report.json"
[[ "$DRY_RUN" == false ]] && echo "The staged copy in $boards_pod:$STAGING_DIR is kept for the next run and goes away when the pod restarts."
