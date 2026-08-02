---
title: Architecture
owner: enzo
status: in-progress
updated: 2026-08-01
---

# Architecture

Ridebook est organisé en monorepo `pnpm` :

- `apps/frontend` : SPA React ;
- `apps/api` : API REST NestJS ;
- `apps/maps-worker` : worker Node.js pour les jobs Google Maps ;
- `packages/contracts` : types et constantes partagés.

Voir aussi :

- [Vue d'ensemble](overview.md)
- [Base de données](database.md)
- [API](api.md)
- [Worker](worker.md)
