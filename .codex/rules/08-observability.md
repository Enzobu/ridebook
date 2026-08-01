# 08 — Observabilité

## Logs

- Logs JSON avec `nestjs-pino` côté API.
- Logs structurés côté worker.
- Pas de `console.log` dans le code applicatif.
- Ne jamais logger mots de passe, JWT, refresh tokens, secrets SMTP ou cookies.

## Correlation ID

- Header `x-correlation-id` généré par le frontend ou l'API si absent.
- Propagé dans les logs API et worker quand applicable.

## API

Logs requis :

- méthode HTTP ;
- route ;
- statut ;
- durée ;
- identifiant utilisateur si authentifié ;
- correlation ID.

## Worker

Logs requis :

- identifiant job ;
- identifiant balade ;
- tentative ;
- étape Selenium courante ;
- durée ;
- résultat ;
- message d'erreur.

## Health

- `/health` : liveness.
- `/ready` : readiness DB et SMTP si nécessaire.
- Healthchecks Docker Compose pour API, worker et database.
