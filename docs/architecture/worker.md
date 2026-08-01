---
title: Worker cartes
owner: enzo
status: draft
updated: 2026-08-01
cdc-ref: "§6"
---

# Worker cartes

Le worker `apps/maps-worker` est un service Node.js séparé de l'API.

Il recevra la logique de récupération des jobs en base, de verrouillage et d'extraction Selenium dans les tickets dédiés.

Les captures Selenium seront stockées dans `SELENIUM_SCREENSHOT_DIR`, mappé depuis l'hôte via `SELENIUM_SCREENSHOT_VOLUME_PATH`.
