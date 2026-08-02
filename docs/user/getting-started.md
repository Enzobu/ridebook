---
title: Prise en main
owner: enzo
status: in-progress
updated: 2026-08-01
---

# Prise en main

## Créer le premier administrateur

Renseigner les variables dans `.env` :

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=mot-de-passe-long
```

Puis exécuter :

```bash
pnpm --filter api create-admin
```

## Inviter un utilisateur

Un administrateur connecté peut générer un lien d'invitation. Le lien est valide 1h et utilisable une seule fois.
