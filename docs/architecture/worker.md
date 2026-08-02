---
title: Worker cartes
owner: enzo
status: implemented
updated: 2026-08-01
cdc-ref: "§6"
---

# Worker cartes

Le worker `apps/maps-worker` est un service Node.js séparé de l'API.

Il traite les jobs de récupération en base avec un claim conditionnel pour éviter que deux workers traitent le même job.

Le worker utilise `WORKER_EXTRACTOR_MODE` :

- `selenium` : ouvre Chromium headless, accepte si possible le consentement Google, ouvre le partage puis l'onglet d'intégration et récupère l'URL `/maps/embed`.
- `fake` : renvoie `WORKER_FAKE_MAP_EMBED_URL` pour les tests et le développement sans dépendance Google.

Les captures Selenium sont stockées dans `SELENIUM_SCREENSHOT_DIR`, mappé depuis l'hôte via `SELENIUM_SCREENSHOT_VOLUME_PATH`. Chaque échec écrit un PNG et un JSON contenant URL courante, titre de page et erreur. Le nettoyage peut être fait côté serveur par rétention classique, par exemple supprimer les fichiers de plus de 30 jours dans le chemin configuré.

Sur échec définitif, le worker envoie un email SMTP à `ADMIN_NOTIFICATION_EMAIL` si `SMTP_USER` et `SMTP_PASSWORD` sont configurés. Le job marque `failureNotifiedAt` avant l'envoi pour éviter les notifications multiples sur le même échec.
