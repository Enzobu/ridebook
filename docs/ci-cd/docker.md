---
title: Docker Compose
owner: enzo
status: implemented
updated: 2026-08-01
cdc-ref: "§15"
---

# Docker Compose

Le fichier `docker-compose.yml` définit :

- `frontend`
- `api`
- `maps-worker`
- `database`

MariaDB utilise uniquement `expose`, sans port publié sur l'hôte.

Les données persistantes sont des bind mounts configurés dans `.env` :

```env
DB_VOLUME_PATH=./.data/mariadb
SELENIUM_SCREENSHOT_VOLUME_PATH=./.data/selenium-errors
```

Sur le serveur Dokploy, ces chemins doivent pointer vers des dossiers inclus dans la stratégie de sauvegarde.
