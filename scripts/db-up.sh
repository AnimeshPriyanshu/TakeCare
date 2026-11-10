#!/usr/bin/env sh
set -eu

NAME="takecare-postgres"
USER="takecare"
PASSWORD="takecare_dev_password"
DATABASE="takecare"
PORT="5433"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
  if [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" != "true" ]; then
    echo "Starting existing $NAME container…"
    docker start "$NAME" >/dev/null
  fi
else
  echo "Creating $NAME container…"
  docker run -d \
    --name "$NAME" \
    -e POSTGRES_USER="$USER" \
    -e POSTGRES_PASSWORD="$PASSWORD" \
    -e POSTGRES_DB="$DATABASE" \
    -p "$PORT:5432" \
    postgres:18-alpine >/dev/null
fi

attempt=1
while [ "$attempt" -le 30 ]; do
  if docker exec "$NAME" pg_isready -U "$USER" -d "$DATABASE" >/dev/null 2>&1; then
    echo "Postgres is ready at postgresql://$USER:$PASSWORD@localhost:$PORT/$DATABASE"
    exit 0
  fi
  sleep 1
  attempt=$((attempt + 1))
done

echo "Postgres did not become ready within 30 seconds. Check: docker logs $NAME"
exit 1
