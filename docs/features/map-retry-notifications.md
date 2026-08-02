---
title: Retry carte et notifications
owner: enzo
status: implemented
cdc-ref: "§10, §11, §12, §16, §24, §31"
adr-refs: []
updated: 2026-08-01
---

# Retry carte et notifications

## Objectif métier

Permettre à un propriétaire ou à un admin de relancer une récupération de carte après un échec temporaire, sans recréer la balade. Prévenir l'administrateur uniquement quand le worker a épuisé toutes les tentatives.

## Scope

**Inclus :** endpoint `POST /api/v1/trips/:id/map/retry`, permissions propriétaire/admin, refus des jobs actifs, réinitialisation du statut carte, notification SMTP sur échec définitif.

**Hors scope :** bouton frontend de retry.

## Règles métier

- Seul le propriétaire de la balade ou un admin peut relancer.
- Une balade doit être en `FAILED` pour être relancée.
- Un job `PENDING` ou `PROCESSING` existant bloque le retry avec une erreur 409.
- Un échec définitif marque `failureNotifiedAt`; cette date empêche tout second email pour le même job.
- Si SMTP n'est pas configuré, le worker ne bloque pas le traitement local, mais aucune notification n'est envoyée.

## Modèle de données

`MapEmbedJob.failureNotifiedAt` stocke l'horodatage de notification d'échec définitif.

## Contrats API

| Type | Contrat | Fichier |
|---|---|---|
| REST | `POST /api/v1/trips/:id/map/retry` | `../../apps/api/src/trips/trips.controller.ts` |
| Bruno | retry carte | `../../bruno/api/trips/retry-trip-map.bru` |

Swagger : `/api-docs#/trips`

## Implémentation

- API : `../../apps/api/src/trips/trips.service.ts`
- Worker repository : `../../apps/maps-worker/src/job-repository.ts`
- Notifier SMTP : `../../apps/maps-worker/src/failure-notifier.ts`

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| Unit | `../../apps/api/src/trips/trips.service.spec.ts` | retry propriétaire, 403, 409 |
| Unit | `../../apps/maps-worker/src/failure-notifier.spec.ts` | contenu email et extraction capture |
| Unit | `../../apps/maps-worker/src/job-repository.spec.ts` | notification unique |
