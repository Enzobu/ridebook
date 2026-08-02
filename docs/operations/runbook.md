---
title: Runbook
owner: enzo
status: draft
updated: 2026-08-01
---

# Runbook

## Démarrage local

```bash
cp .env.example .env
docker compose --env-file .env up --build
```

## Vérification

- Frontend : `FRONTEND_URL`
- API health : `API_URL/health`
- Swagger : `API_URL/api-docs`
