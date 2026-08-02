# 09 — Monorepo & dépendances

## Gestion

- Toujours utiliser `pnpm` depuis la racine.
- Ajouter une dépendance via `pnpm --filter <workspace> add <pkg>`.
- Jamais `npm install` dans un sous-dossier.

## Workspaces attendus

- `apps/frontend`
- `apps/api`
- `apps/maps-worker`
- `packages/contracts`
- `packages/eslint-config`
- `packages/tsconfig`

## Dépendances

- `apps/*` ne dépendent que de `packages/*` et de dépendances externes.
- `packages/*` ne dépendent pas de `apps/*`.
- Pas de dépendances circulaires.

## `@ridebook/contracts`

- Types, enums et constantes uniquement.
- Pas de dépendance runtime Nest, React, Prisma, Zod ou class-validator.
- `private: true`.
- Rebuild obligatoire après modification : `pnpm --filter @ridebook/contracts build`.

## Scripts standards

Chaque app maintient : `build`, `dev` ou `start:dev`, `lint`, `test`, `test:e2e`.
