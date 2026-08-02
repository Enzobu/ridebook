# 07 — Sécurité

## Secrets

- Aucun secret en git.
- `.env` gitignoré.
- `.env.example` complet et maintenu.
- Secrets Dokploy/CI via coffre de secrets.

## Auth

- JWT access token en cookie HTTP-only.
- Refresh token en cookie HTTP-only séparé.
- Access token valide 24h.
- Refresh token rotatif, hashé en base, jamais stocké brut.
- Logout invalide le refresh token courant.
- Lecture des balades publique.
- Création, modification et suppression nécessitent une session.
- Admin peut tout gérer.
- User peut modifier et soft delete uniquement ses propres balades.
- Création du premier admin via CLI.
- Création de compte par invitation admin, valide 1h, utilisable une seule fois.

## Entrées API

- Validation backend obligatoire.
- `ValidationPipe` global avec whitelist, forbidNonWhitelisted et transform.
- Validation frontend via Zod pour l'UX, jamais comme seule barrière.

## URLs Google Maps

- HTTPS obligatoire.
- Hostname strictement autorisé.
- Pas de localhost, IP privées, schémas non HTTP(S), fichiers locaux.
- Limites de redirections, timeout et taille de réponse.

## CORS et rate limit

- CORS explicite via env, jamais `*` en production.
- Rate limiting sur endpoints publics sensibles : login, refresh, invitations, retry.

## Frontend

- Pas de token en `localStorage`.
- Pas de `dangerouslySetInnerHTML` pour les cartes.
- Iframe Maps uniquement depuis une URL validée en base.
