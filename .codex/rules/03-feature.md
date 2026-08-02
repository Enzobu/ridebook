# 03 — Une feature = tests + documentation

## Règle

Aucune feature n'est prête sans :

1. tests automatisés au niveau adapté ;
2. documentation `docs/features/<feature>.md` à jour ;
3. Swagger à jour pour les routes API ;
4. collection Bruno à jour pour les routes API ;
5. `.env.example` à jour si une variable est ajoutée ;
6. doc utilisateur à jour si un parcours utilisateur change.

## Template `docs/features/<feature>.md`

```markdown
---
title: <Nom de la feature>
owner: <prénom>
status: draft | in-progress | implemented | deprecated
cdc-ref: "§X"
adr-refs: []
updated: YYYY-MM-DD
---

# <Nom de la feature>

## Objectif métier
Pourquoi cette feature existe pour Ridebook.

## Scope
**Inclus :** ...
**Hors scope :** ...

## Parcours utilisateur
- En tant que <visiteur | utilisateur | administrateur>, je veux <action>, afin de <bénéfice>.

## Règles métier
Invariants, permissions, cas limites, statuts.

## Modèle de données
Entités et relations impactées.

## Contrats API
| Type | Contrat | Fichier |
|---|---|---|
| REST | `GET /api/v1/trips` | `apps/api/src/trips/interface/trips.controller.ts` |
| Types | `TripDto` | `packages/contracts/src/trip.ts` |

## Architecture technique
Flux entre frontend, API, base et worker.

## Implémentation
- **Domain** : `apps/<app>/src/<feature>/domain/`
- **Application** : `apps/<app>/src/<feature>/application/`
- **Infrastructure** : `apps/<app>/src/<feature>/infrastructure/`
- **Interface** : `apps/<app>/src/<feature>/interface/`
- **Front** : `apps/frontend/src/features/<feature>/`

## Tests
| Niveau | Fichier | Couvre |
|---|---|---|
| Unit | `*.spec.ts` | règles métier |
| Intégration | `test/*.e2e-spec.ts` | API + DB |
| UI | `apps/frontend/tests/features/<feature>/*.test.tsx` | composants |
| E2E | `tests/e2e/<feature>.spec.ts` | parcours critique |

## Documentation utilisateur
Lien : [`../user/<feature>.md`](../user/<feature>.md)
```

## Definition of Done feature

- tests unitaires sur la logique critique ;
- tests d'intégration si DB, HTTP, mailer ou worker sont traversés ;
- tests UI/e2e pour les parcours critiques ;
- Swagger et Bruno à jour ;
- documentation feature et utilisateur à jour ;
- `pnpm -r lint`, `pnpm -r test`, `pnpm -r build` passants.
