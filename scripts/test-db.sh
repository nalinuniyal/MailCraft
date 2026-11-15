#!/usr/bin/env bash
# Applies migrations + seed to a throwaway database on a local Postgres and runs
# the RLS isolation tests. Set PGURL to a superuser connection string.
set -euo pipefail
cd "$(dirname "$0")/.."
PGURL=${PGURL:-postgres://postgres@localhost:5432/postgres}
DB=mailcraft_rls_test
psql "$PGURL" -qc "drop database if exists $DB" -c "create database $DB"
TEST_URL="${PGURL%/*}/$DB"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/supabase-shim.sql
for f in supabase/migrations/*.sql; do psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
if [ -f supabase/seed.sql ]; then psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/seed.sql; fi
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/rls.test.sql
psql "$PGURL" -qc "drop database $DB"
