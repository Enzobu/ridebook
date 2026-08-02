---
title: Invitations administrateur
owner: enzo
status: implemented
cdc-ref: "§3, §24, §31"
adr-refs: []
updated: 2026-08-01
---

# Invitations administrateur

## Objectif métier

Permettre à un administrateur d'ajouter un utilisateur sans manipuler l'API manuellement. Le lien généré est transmis à la personne invitée pour créer son compte.

## Scope

**Inclus :** écran admin protégé, génération d'un lien, copie presse-papiers, message de validité 1h et usage unique.

**Hors scope :** liste complète des invitations et révocation manuelle.

## Règles métier

- Seuls les admins voient l'entrée de menu `Invitations`.
- L'API reste responsable de l'autorisation.
- Le lien affiché est copiable depuis l'interface.

## Contrats API

| Type | Contrat | Fichier |
|---|---|---|
| REST | `POST /api/v1/invitations` | `../../apps/api/src/auth/auth.controller.ts` |
| Types | `InvitationDto` | `../../packages/contracts/src/index.ts` |

## Tests

| Niveau | Fichier | Couvre |
|---|---|---|
| UI | `../../apps/frontend/src/App.spec.tsx` | génération, copie, masquage non-admin |
