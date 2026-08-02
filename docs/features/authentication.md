---
title: Authentification
owner: enzo
status: implemented
cdc-ref: "§3, §12, §13, §16, §31"
adr-refs: []
updated: 2026-08-01
---

# Authentification

## Objectif métier

Protéger les actions de gestion Ridebook sans inscription publique. La lecture des balades reste publique ; les comptes sont créés par invitation.

## Scope

**Inclus :** login, logout, refresh token rotatif, lecture session, création du premier admin par CLI, génération d'invitation admin, création de compte depuis invitation.

**Hors scope :** écrans frontend et gestion avancée des invitations.

## Parcours utilisateur

- En tant qu'administrateur, je crée le premier compte admin par CLI.
- En tant qu'administrateur, je génère un lien d'invitation.
- En tant qu'utilisateur invité, je crée mon compte depuis ce lien.
- En tant qu'utilisateur, je me connecte et la session est maintenue par cookies HTTP-only.

## Règles métier

- Access token JWT valide 24h.
- Refresh token valide 7 jours, rotatif, hashé en base.
- Une invitation expire après 1h.
- Une invitation est utilisable une seule fois.
- Seul `ADMIN` peut créer une invitation.
- Les tokens ne sont jamais stockés en `localStorage`.

## Modèle de données

- `User`
- `RefreshToken`
- `Invitation`

Voir `apps/api/prisma/schema.prisma`.

## Contrats API

| Type | Contrat | Fichier |
|---|---|---|
| REST | `POST /api/v1/auth/login` | `apps/api/src/auth/auth.controller.ts` |
| REST | `POST /api/v1/auth/refresh` | `apps/api/src/auth/auth.controller.ts` |
| REST | `POST /api/v1/auth/logout` | `apps/api/src/auth/auth.controller.ts` |
| REST | `GET /api/v1/auth/me` | `apps/api/src/auth/auth.controller.ts` |
| REST | `POST /api/v1/auth/register` | `apps/api/src/auth/auth.controller.ts` |
| REST | `POST /api/v1/invitations` | `apps/api/src/auth/invitations.controller.ts` |

## Implémentation

- API : `apps/api/src/auth/`
- Prisma : `apps/api/prisma/schema.prisma`
- CLI admin : `apps/api/src/cli/create-admin.ts`
- Bruno : `bruno/api/auth/`

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| Unit | `apps/api/src/auth/token.utils.spec.ts` | génération et hash token |
| Unit | `apps/api/src/auth/auth.service.spec.ts` | rotation refresh token |
| Unit | `apps/api/src/auth/invitations.service.spec.ts` | invitation expirée ou déjà utilisée |

## Documentation utilisateur

Lien : [`../user/getting-started.md`](../user/getting-started.md)
