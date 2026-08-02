---
title: Balades
owner: enzo
status: implemented
cdc-ref: "§4, §5, §8, §12, §13, §31"
adr-refs: []
updated: 2026-08-01
---

# Balades

## Objectif métier

Centraliser les trajets Google Maps dans Ridebook avec une lecture publique et une gestion protégée.

## Scope

**Inclus :** CRUD API, lecture publique, soft delete, permissions propriétaire/admin, validation URL Google Maps, recherche/tri/filtre/pagination, création d'un job carte `PENDING`.

**Hors scope :** worker Selenium réel, UI frontend.

## Parcours utilisateur

- En tant que visiteur, je consulte les balades.
- En tant qu'utilisateur connecté, je crée et gère mes balades.
- En tant qu'administrateur, je peux gérer toutes les balades.

## Règles métier

- `GET /trips` et `GET /trips/{id}` sont publics.
- `POST`, `PATCH`, `DELETE` nécessitent une session.
- `USER` ne gère que ses propres balades.
- `ADMIN` peut tout gérer.
- La suppression est logique avec `deletedAt`.
- Toute création ou changement de lien Google Maps crée un job de carte `PENDING`.
- Les images de couverture sont hors MVP.

## Modèle de données

- `Trip`
- `MapEmbedJob`

Voir `apps/api/prisma/schema.prisma`.

## Contrats API

| Type | Contrat | Fichier |
|---|---|---|
| REST | `GET /api/v1/trips` | `apps/api/src/trips/trips.controller.ts` |
| REST | `POST /api/v1/trips` | `apps/api/src/trips/trips.controller.ts` |
| REST | `GET /api/v1/trips/{id}` | `apps/api/src/trips/trips.controller.ts` |
| REST | `PATCH /api/v1/trips/{id}` | `apps/api/src/trips/trips.controller.ts` |
| REST | `DELETE /api/v1/trips/{id}` | `apps/api/src/trips/trips.controller.ts` |

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| Unit | `apps/api/src/trips/google-maps-url.validator.spec.ts` | validation stricte des URLs |
| Unit | `apps/api/src/trips/trips.service.spec.ts` | permissions propriétaire/admin |
