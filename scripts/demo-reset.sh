#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
echo "Resetting TakeCare demo data…"
npm --prefix "$ROOT/server" run db:seed
echo "Demo data is ready. Password for every account: Password123!"
