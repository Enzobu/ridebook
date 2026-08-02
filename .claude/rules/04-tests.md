# 04 — Tests

## Pyramide

- Beaucoup d'unitaires rapides.
- Quelques tests d'intégration avec MariaDB via `docker-compose.test.yml`.
- Un minimum d'e2e sur les parcours critiques.

## Priorités Ridebook

- validation stricte des URLs Google Maps ;
- permissions : lecture publique, écriture authentifiée, droits propriétaire/admin ;
- auth JWT access/refresh et invitations à usage unique ;
- création/modification/suppression logique de balades ;
- création, verrouillage, retry et détection des jobs bloqués ;
- abstraction Selenium simulable ;
- affichage des statuts de carte et polling frontend.

## Convention

- Pattern AAA : Arrange / Act / Assert.
- Un comportement par test.
- Nom en anglais impératif : `should reject non google maps url`.
- Aucun test ne doit dépendre du vrai Google Maps en CI standard.

## Environnement

- Pas de vraie DB sans compose de test dédié.
- Seeds jetables en début de test, cleanup à la fin.
- Tests flaky interdits : corriger ou isoler explicitement.
