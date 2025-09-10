#!/bin/bash

set -euo pipefail

echo "🚀 Admin migration runner"

DB_HOST="${DB_HOST:-db.lzlrojoaxrqvmhempnkn.supabase.co}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:-}" # provide via env
DB_NAME="${DB_NAME:-postgres}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Please install PostgreSQL client to run migrations." >&2
  exit 1
fi

if [ -z "${1:-}" ]; then
  echo "Usage: $0 supabase/migrations/<file>.sql" >&2
  exit 1
fi

SQL_FILE="$1"
if [ ! -f "$SQL_FILE" ]; then
  echo "SQL file not found: $SQL_FILE" >&2
  exit 1
fi

if [ -z "$DB_PASS" ]; then
  echo "DB_PASS is not set. Export DB_PASS to run non-interactively." >&2
  exit 1
fi

echo "Applying migration: $SQL_FILE"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
echo "✅ Migration applied: $SQL_FILE"