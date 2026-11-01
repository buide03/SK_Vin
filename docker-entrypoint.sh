#!/bin/sh
set -eu
# Only this mount is supported by the image. Never recursively chown data.
if [ "${DATA_DIR:-}" != "/var/data" ]; then
  echo 'DATA_DIR must be /var/data in this image' >&2
  exit 1
fi
if [ "$(id -u)" = "0" ]; then
  mkdir -p /var/data
  chown node:node /var/data
  exec gosu node "$0" "$@"
fi
# Existing clusters are never overwritten. Only a fresh data directory gets
# the empty cluster made with the identical PGlite build in this image.
if [ "${DB_BACKEND:-}" != "postgres" ] && [ -z "${DATABASE_URL:-}" ] && [ ! -e /var/data/pg ]; then
  cp -R /app/db-template /var/data/pg
fi
exec "$@"
