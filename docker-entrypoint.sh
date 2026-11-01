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
  exec gosu node "$@"
fi
exec "$@"
