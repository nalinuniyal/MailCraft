#!/usr/bin/env bash
# Starts the local stack, applies migrations + seed, and writes .env.e2e
set -euo pipefail
cd "$(dirname "$0")"
export JWT_SECRET=${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters}
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
docker compose up -d --wait db
docker compose up -d auth rest gateway
for i in $(seq 1 60); do
  if curl -fsS http://localhost:54321/auth/v1/health >/dev/null 2>&1; then break; fi
  sleep 2
done
for f in ../../supabase/migrations/*.sql ../../supabase/seed.sql; do
  [ -f "$f" ] || continue
  docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -h localhost -v ON_ERROR_STOP=1 -q -U supabase_admin -d postgres < "$f"
done
docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -h localhost -U supabase_admin -d postgres -qc "notify pgrst, 'reload schema'"
ANON=$(node jwt.mjs "$JWT_SECRET" anon)
cat > ../../.env.e2e <<ENV
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV
echo "Local stack ready. Env written to .env.e2e"
