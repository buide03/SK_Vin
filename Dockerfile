# syntax=docker/dockerfile:1
FROM node:24.22.1-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build
# Run initdb at build time, where two WASM instances fit. This template has no
# app tables, sessions, student records, credentials, or model requests.
RUN node --input-type=module -e "import {PGlite} from '@electric-sql/pglite'; const db=await PGlite.create('/app/db-template'); const r=await db.query(\"SELECT tablename FROM pg_tables WHERE schemaname='public'\"); if(r.rows.length) throw Error('Template must have no app tables'); await db.close();"

FROM node:24.22.1-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends gosu tini \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 PORT=10000 DATA_DIR=/var/data \
    APP_MODE=demo MODEL_MODE=mock DEMO_REQUIRE_ACCESS=true
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/db/migrations ./db/migrations
COPY --from=builder --chown=node:node /app/db-template ./db-template
COPY --from=builder --chown=node:node /app/node_modules/@electric-sql/pglite ./node_modules/@electric-sql/pglite
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/agent-entrypoint
EXPOSE 10000
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/agent-entrypoint"]
# Avoid background optimizing compilation of the large Postgres WASM module.
CMD ["node", "--no-wasm-tier-up", "server.js"]
