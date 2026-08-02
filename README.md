# Ridebook

Ridebook centralise des balades moto créées avec Google Maps.

## Stack

- Monorepo `pnpm`
- Frontend React + Vite
- API NestJS
- Worker Node.js pour la récupération des cartes
- MariaDB
- Docker Compose, prévu pour Dokploy

## Installation

```bash
pnpm install
cp .env.example .env
pnpm build
```

## Développement

```bash
pnpm dev
pnpm lint
pnpm test
pnpm build
```

## Docker Compose

```bash
cp .env.example .env
docker compose --env-file .env config
docker compose --env-file .env up --build
```

Les données persistantes utilisent des bind mounts configurés dans `.env` :

- `DB_VOLUME_PATH`
- `SELENIUM_SCREENSHOT_VOLUME_PATH`

Le service MariaDB n'expose pas de port sur l'hôte. Il est uniquement accessible par les autres services du réseau Compose.

## Documentation

- CDC : [docs/cahier_des_charges_balades_moto.md](docs/cahier_des_charges_balades_moto.md)
- Architecture : [docs/architecture/README.md](docs/architecture/README.md)
- Features : [docs/features/README.md](docs/features/README.md)
- Déploiement : [docs/ci-cd/docker.md](docs/ci-cd/docker.md)
