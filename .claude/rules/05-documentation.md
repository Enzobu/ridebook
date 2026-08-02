# 05 — Documentation

## Arborescence `docs/`

```text
docs/
├── README.md
├── cahier_des_charges_balades_moto.md
├── architecture/
│   ├── README.md
│   ├── overview.md
│   ├── database.md
│   ├── api.md
│   ├── worker.md
│   └── diagrams/
├── features/
│   ├── README.md
│   └── <feature>.md
├── testing/
│   ├── README.md
│   ├── strategy.md
│   └── test-plan.md
├── adr/
│   ├── README.md
│   └── NNNN-titre.md
├── ci-cd/
│   ├── README.md
│   └── docker.md
├── user/
│   ├── README.md
│   ├── getting-started.md
│   ├── trips.md
│   └── faq.md
└── operations/
    ├── runbook.md
    ├── deployment.md
    └── troubleshooting.md
```

## Règles de rédaction

- Frontmatter YAML obligatoire : `title`, `owner`, `status`, `updated`.
- Une feature = un fichier `docs/features/<feature>.md`.
- Liens relatifs uniquement.
- Mermaid inline pour les diagrammes simples.
- `docs/user/` en français.

## API

- Swagger exhaustif sur `/api-docs`.
- Chaque endpoint et DTO a des exemples réalistes.
- Bruno vit dans `bruno/` et doit être mis à jour pour toute route ajoutée ou modifiée.

## README

Chaque app a un `README.md` avec rôle, stack, commandes, variables d'env et points d'entrée.

Le README racine décrit l'installation, Docker Compose, Dokploy, les commandes workspace et les liens vers `docs/`.
