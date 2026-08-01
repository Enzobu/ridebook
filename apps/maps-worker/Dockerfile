FROM node:24-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/maps-worker/package.json apps/maps-worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter maps-worker build

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && useradd --create-home --shell /usr/sbin/nologin worker

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/maps-worker/package.json apps/maps-worker/package.json
RUN pnpm install --prod --filter maps-worker --frozen-lockfile

COPY --from=build /app/apps/maps-worker/dist apps/maps-worker/dist

RUN mkdir -p /storage/selenium-errors \
  && chown -R worker:worker /storage /app

USER worker
WORKDIR /app/apps/maps-worker
CMD ["node", "dist/main.js"]
