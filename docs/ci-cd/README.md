---
title: CI/CD
owner: enzo
status: implemented
updated: 2026-08-01
---

# CI/CD

Le workflow GitHub Actions `.github/workflows/ci.yml` lance un job qualité sur les pull requests et les pushes.

## Job qualité

Le job `Quality` exécute :

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`
5. `pnpm compose:config`

La commande `compose:config` valide `docker-compose.yml` avec `.env.example`, ce qui détecte les variables manquantes ou une configuration Compose invalide.

## Déploiement Dokploy

Le job `Deploy prod` reste limité aux pushes sur `main` et dépend du job qualité. Il appelle l'API Dokploy existante.

Secrets GitHub requis, sans valeur en dépôt :

- `DOKPLOY_PROD_API_KEY`
- `DOKPLOY_PROD_COMPOSE_ID`
