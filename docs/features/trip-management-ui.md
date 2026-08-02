---
title: Gestion des balades authentifiée
owner: enzo
status: implemented
cdc-ref: "§3, §4, §5, §9, §10, §21, §24, §25, §31"
adr-refs: []
updated: 2026-08-01
---

# Gestion des balades authentifiée

## Objectif métier

Permettre aux utilisateurs connectés de maintenir leurs balades depuis l'interface web. Le détail suit automatiquement l'état de récupération de carte pour éviter les rechargements manuels.

## Scope

**Inclus :** login/logout, inscription via invitation, création/modification/suppression de balade, actions conditionnelles propriétaire/admin, retry de carte en échec, polling du détail toutes les 5 secondes.

**Hors scope :** génération d'invitation admin.

## Règles métier

- Les actions de gestion sont affichées uniquement si l'utilisateur est admin ou propriétaire.
- La suppression demande une confirmation contenant le nom de la balade.
- Le polling s'arrête quand le statut carte n'est plus `PENDING` ou `PROCESSING`.
- Le polling ne requête pas l'API quand l'onglet est masqué.
- Modifier le lien Google Maps repasse la carte en récupération via l'API.

## Contrats API

| Type | Contrat | Fichier |
|---|---|---|
| REST | `POST /api/v1/auth/login` | `../../apps/api/src/auth/auth.controller.ts` |
| REST | `POST /api/v1/auth/register` | `../../apps/api/src/auth/auth.controller.ts` |
| REST | `POST/PATCH/DELETE /api/v1/trips` | `../../apps/api/src/trips/trips.controller.ts` |
| REST | `POST /api/v1/trips/:id/map/retry` | `../../apps/api/src/trips/trips.controller.ts` |

## Implémentation

- UI : `../../apps/frontend/src/App.tsx`
- Client API : `../../apps/frontend/src/api.ts`
- Types partagés : `../../packages/contracts/src/index.ts`

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| UI | `../../apps/frontend/src/App.spec.tsx` | création, permissions, retry, polling, thème |

## Documentation utilisateur

Lien : [`../user/trips.md`](../user/trips.md)
