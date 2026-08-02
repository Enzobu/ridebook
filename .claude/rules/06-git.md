# 06 — Git & workflow

## Conventional Commits

Format : `type(scope): description`

Types autorisés : `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `style`.

Scopes Ridebook :

- `front`
- `api`
- `worker`
- `contracts`
- `docker`
- `ci`
- `docs`

Exemples :

- `feat(api): add refresh token rotation`
- `feat(worker): process map embed jobs`
- `docs(adr): choose jwt cookie authentication`

## Branches

- Base : `dev`.
- Release : `main`.
- Branches : `feat/<scope>-<desc>`, `fix/<scope>-<desc>`, `chore/<scope>-<desc>`, `docs/<scope>-<desc>`.

## PR

- Aucun commit direct sur `dev` ou `main`.
- Review obligatoire avant merge.
- Description : contexte, changements, tests, liens issue/ADR/CDC.
- Ne jamais bypass les hooks avec `--no-verify`.
