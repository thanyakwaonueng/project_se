#!/bin/sh

# Wait until Postgres is ready
echo "Waiting for postgres..."

until nc -z db 5432; do
  sleep 1
done

echo "Postgres is up!"

# Generate Prisma client now, after DB is ready
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

# Run your app
exec "$@"

