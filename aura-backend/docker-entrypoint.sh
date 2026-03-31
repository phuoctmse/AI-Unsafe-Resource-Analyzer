#!/bin/sh
set -e
# pnpm links prisma under this package, not /app/node_modules (monorepo root).
node ./node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma
exec node ./dist/index.js
