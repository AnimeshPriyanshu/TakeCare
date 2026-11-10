#!/usr/bin/env sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SERVER_PID=""
CLIENT_PID=""

cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  [ -n "$CLIENT_PID" ] && kill "$CLIENT_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Starting TakeCare API on http://localhost:3001"
npm --prefix "$ROOT/server" run dev &
SERVER_PID=$!

echo "Starting TakeCare client on http://localhost:3000"
npm --prefix "$ROOT/client" run dev &
CLIENT_PID=$!

wait
