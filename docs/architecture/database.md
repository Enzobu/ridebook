---
title: Base de données
owner: enzo
status: draft
updated: 2026-08-01
cdc-ref: "§13"
---

# Base de données

La base cible est MariaDB. Le schéma Prisma sera ajouté avec les tickets d'authentification, de balades et de jobs.

Le service `database` du Docker Compose utilise un bind mount configuré par `DB_VOLUME_PATH`.
