---
title: Queue de récupération carte
owner: enzo
status: implemented
cdc-ref: "§5, §6, §9, §10, §13, §15, §31"
adr-refs: []
updated: 2026-08-01
---

# Queue de récupération carte

## Objectif métier

Créer les balades immédiatement sans attendre la récupération Google Maps.

## Scope

**Inclus :** table `MapEmbedJob`, création de job à la création/changement de lien, worker séparé, claim conditionnel anti double traitement, retries, échec définitif, récupération des jobs bloqués.

**Hors scope :** Selenium réel et emails d'échec définitif.

## Règles métier

- Un job `PENDING` est créé avec la balade.
- Le worker réclame un job par update conditionnel sur `status = PENDING`.
- Une tentative échouée est replanifiée.
- Après `maxAttempts`, le job et la balade passent en `FAILED`.
- Un job `PROCESSING` trop ancien est traité comme bloqué.

## Implémentation

- API création job : `apps/api/src/trips/trips.service.ts`
- Worker : `apps/maps-worker/src/job-repository.ts`
- Processor : `apps/maps-worker/src/job-processor.ts`
- Retry policy : `apps/maps-worker/src/retry-policy.ts`

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| Unit | `apps/maps-worker/src/retry-policy.spec.ts` | délais et échec définitif |
| Unit | `apps/maps-worker/src/job-repository.spec.ts` | claim concurrent et jobs bloqués |
