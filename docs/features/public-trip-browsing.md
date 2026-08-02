---
title: Consultation publique des balades
owner: enzo
status: implemented
cdc-ref: "§2, §4.4, §4.5, §17-25, §31"
adr-refs: []
updated: 2026-08-01
---

# Consultation publique des balades

## Objectif métier

Permettre à n'importe quel visiteur de consulter les balades Ridebook sans compte. Les cartes de liste affichent les informations utiles avant d'ouvrir le détail ou Google Maps.

## Scope

**Inclus :** shell responsive, liste publique, recherche, filtre statut, tri, chargement progressif, détail public, thème clair/sombre/system, états vide/erreur/loading.

**Hors scope :** création, modification, suppression et retry depuis le frontend.

## Règles métier

- La lecture des balades est publique.
- Le bouton Google Maps ouvre le lien original dans un nouvel onglet avec `noopener noreferrer`.
- Si l'embed est disponible, le détail affiche l'iframe. Sinon, il affiche le statut de récupération.
- Le thème est persistant dans `localStorage`.

## Contrats API

| Type | Contrat | Fichier |
|---|---|---|
| REST | `GET /api/v1/trips` | `../../apps/api/src/trips/trips.controller.ts` |
| REST | `GET /api/v1/trips/:id` | `../../apps/api/src/trips/trips.controller.ts` |
| Types | `TripDto`, `TripListDto` | `../../packages/contracts/src/index.ts` |

## Implémentation

- Front : `../../apps/frontend/src/App.tsx`
- API client : `../../apps/frontend/src/api.ts`
- Styles : `../../apps/frontend/src/styles.css`

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| UI | `../../apps/frontend/src/App.spec.tsx` | liste, état vide, détail, lien Google Maps, thème |

## Documentation utilisateur

Lien : [`../user/trips.md`](../user/trips.md)
