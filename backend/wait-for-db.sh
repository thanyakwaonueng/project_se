#!/bin/sh

# Wait until Postgres is ready
echo "Waiting for postgres..."

until nc -z db 5432; do
  sleep 1
done

echo "Postgres is up!"

# Run your app
exec "$@"

