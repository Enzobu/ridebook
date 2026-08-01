# API Ridebook

API REST NestJS de Ridebook.

## Commandes

```bash
pnpm --filter api dev
pnpm --filter api build
pnpm --filter api lint
pnpm --filter api test
```

## Points d'entrée

- `GET /health`
- `GET /ready`
- Swagger : `/api-docs`

Les endpoints métier seront ajoutés par les tickets auth, balades et worker.
