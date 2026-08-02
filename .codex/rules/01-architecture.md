# 01 — Architecture

## Clean architecture

Séparation stricte entre **domain**, **application**, **infrastructure**, **interface**.

- Le **domain** n'importe ni Prisma, ni HTTP, ni React, ni Selenium.
- L'**application** dépend du domain et parle à des ports.
- L'**infrastructure** implémente les ports : Prisma, mailer, Selenium, filesystem.
- L'**interface** expose les contrôleurs REST, pages React, CLI ou processus worker.

## Frontières du monorepo

`apps/<a>` ne peut pas importer `apps/<b>`.

Les échanges se font par contrat explicite :

- frontend → API REST ;
- maps-worker → base de données et ports applicatifs dédiés ;
- types partagés → `@ridebook/contracts`.

## Types partagés

Les types publics, enums et constantes communes vivent dans `@ridebook/contracts`.

Ne jamais redéfinir localement un type déjà présent dans `contracts`. Si un type manque, l'ajouter au package puis rebuild.
