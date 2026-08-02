# API Ridebook

API REST NestJS de Ridebook.

## Commandes

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api lint
pnpm --filter api test
```

## Prisma

```bash
pnpm --filter api prisma:generate
pnpm --filter api prisma:migrate
```

## Premier administrateur

Après avoir renseigné `ADMIN_EMAIL` et `ADMIN_PASSWORD` :

```bash
pnpm --filter api create-admin
```

## Points d'entrée

- `GET /health`
- `GET /ready`
- Swagger : `/api-docs`

Endpoints auth :

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/register`
- `POST /api/v1/invitations`

Endpoints balades :

- `GET /api/v1/trips`
- `POST /api/v1/trips`
- `GET /api/v1/trips/:id`
- `PATCH /api/v1/trips/:id`
- `DELETE /api/v1/trips/:id`
