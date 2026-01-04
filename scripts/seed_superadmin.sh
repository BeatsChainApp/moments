#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   export DATABASE_URL=postgres://user:pass@host:5432/dbname
#   export SUPERADMIN_USER_ID=00000000-0000-0000-0000-000000000000
#   ./scripts/seed_superadmin.sh
#
# The script will insert or update an admin_roles mapping for the provided user id.

SQL_FILE_CONTENT="-- Seed a superadmin mapping for Unami Foundation Moments
INSERT INTO public.admin_roles (user_id, role)
VALUES ('${SUPERADMIN_USER_ID}', 'superadmin')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
"

DB_URL="${DATABASE_URL:-}" 

if [ -z "${SUPERADMIN_USER_ID:-}" ]; then
  echo "ERROR: set SUPERADMIN_USER_ID env var to the target Supabase user UUID"
  exit 1
fi

if [ -z "$DB_URL" ]; then
  echo "No DATABASE_URL provided. Here is the SQL you can paste into Supabase SQL editor:"
  echo
  echo "$SQL_FILE_CONTENT"
  exit 0
fi

if command -v psql >/dev/null 2>&1; then
  echo "Applying seed via psql to $DB_URL"
  echo "$SQL_FILE_CONTENT" | psql "$DB_URL" --set ON_ERROR_STOP=on
  echo "Seed applied."
  exit 0
fi

if command -v docker >/dev/null 2>&1; then
  echo "psql not found; attempting to run psql inside Docker postgres image as a fallback..."
  echo "$SQL_FILE_CONTENT" | docker run --rm -i postgres:15 psql "$DB_URL" -v ON_ERROR_STOP=1 && echo "Seed applied via Docker psql." && exit 0 || true
fi

echo "Could not run psql. Paste this SQL into your Supabase SQL editor:"

echo
echo "$SQL_FILE_CONTENT"

exit 0
