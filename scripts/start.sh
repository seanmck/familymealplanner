#!/usr/bin/env sh
# Boot wrapper for Railway: apply pending migrations, then serve.
#
# Migrations run here rather than in `npm run build` because Railway builds in a
# sandbox that has no private-network route to Postgres — DATABASE_URL resolves
# only at runtime. Running them at boot also means a failed migration fails the
# release before the healthcheck passes, so Railway keeps the old container
# serving traffic instead of swapping in a broken one.
set -e

echo "prisma: applying migrations..."
npx prisma migrate deploy

echo "prisma: migrations up to date — starting Next.js"
exec npm start
