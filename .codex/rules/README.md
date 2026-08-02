# Règles transverses du monorepo Ridebook

Ce dossier contient les règles obligatoires applicables à tout le projet Ridebook.

**Source canonique** : ces fichiers. Ils sont chargés via la skill `rules`.

| Fichier | Thème |
|---|---|
| [`01-architecture.md`](01-architecture.md) | Clean architecture, dependency rule, no cross-app imports |
| [`02-code.md`](02-code.md) | TypeScript strict, nommage, petites unités |
| [`03-feature.md`](03-feature.md) | Une feature = tests + documentation |
| [`04-tests.md`](04-tests.md) | Pyramide, AAA, coverage priorités |
| [`05-documentation.md`](05-documentation.md) | Swagger, ADR, README, Bruno, doc utilisateur |
| [`06-git.md`](06-git.md) | Conventional Commits, branches, PR |
| [`07-security.md`](07-security.md) | OWASP, secrets, validation, auth, CORS |
| [`08-observability.md`](08-observability.md) | Logs structurés, correlation ID, health endpoints |
| [`09-monorepo.md`](09-monorepo.md) | Dépendances, pas de cycles, `@ridebook/contracts` |
| [`10-ai-parity.md`](10-ai-parity.md) | Parité Claude Code ↔ Codex |

## Sous-projets prévus

- `apps/frontend/`
- `apps/api/`
- `apps/maps-worker/`
- `packages/contracts/`
- `packages/eslint-config/`
- `packages/tsconfig/`

En cas de conflit entre une règle transverse et un `AGENTS.md` de sous-projet, la règle la plus spécifique l'emporte.
