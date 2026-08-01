---
title: Worker cartes
owner: enzo
status: draft
updated: 2026-08-01
cdc-ref: "§6"
---

# Worker cartes

Le worker `apps/maps-worker` est un service Node.js séparé de l'API.

Il traite les jobs de récupération en base avec un claim conditionnel pour éviter que deux workers traitent le même job.

Les captures Selenium seront stockées dans `SELENIUM_SCREENSHOT_DIR`, mappé depuis l'hôte via `SELENIUM_SCREENSHOT_VOLUME_PATH`.

Le worker utilise actuellement un extracteur fake pour valider le cycle de queue sans dépendre du vrai Google Maps. Selenium réel sera ajouté dans la feature dédiée.
