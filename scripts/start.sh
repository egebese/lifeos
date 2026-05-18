#!/bin/sh
# Production container entry — runs sequentially: migrate → bootstrap admin → seed exercises → seed templates → start server.
set -e

echo "→ running migrations"
node scripts/migrate.cjs

echo "→ bootstrap admin"
node scripts/bootstrap-admin.cjs || true

echo "→ seed exercises"
node scripts/seed-exercises.cjs || true

echo "→ seed templates"
node scripts/seed-templates.cjs || true

echo "→ starting next"
exec node server.js
