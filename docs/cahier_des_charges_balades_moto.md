# Cahier des charges — Application de gestion de balades moto

## 1. Présentation du projet

L’application permet de centraliser, organiser et consulter des itinéraires de balades moto créés avec Google Maps.

L’utilisateur crée son trajet sur Google Maps avec plusieurs étapes, récupère le lien de partage, puis l’enregistre dans l’application.

L’application doit ensuite récupérer automatiquement, de manière asynchrone, le lien d’intégration Google Maps permettant d’afficher le trajet dans une iframe.

L’objectif principal est de remplacer le stockage manuel des liens dans Discord par une interface dédiée, responsive, claire et agréable à utiliser aussi bien sur ordinateur que sur smartphone.

---

## 2. Objectifs

- Centraliser les balades moto dans une seule application.
- Conserver le lien Google Maps original afin de pouvoir ouvrir directement le trajet dans l’application Google Maps.
- Afficher une prévisualisation du trajet dans une iframe Google Maps.
- Récupérer automatiquement le lien d’intégration à partir du lien de partage.
- Ne jamais bloquer la création d’un trajet pendant le traitement Selenium.
- Informer clairement l’utilisateur de l’état de récupération de la carte.
- Permettre de relancer manuellement une récupération ayant échoué.
- Envoyer une notification par email en cas d’échec définitif.
- Fournir une interface entièrement responsive.
- Proposer un thème clair et un thème sombre.
- Éviter un thème sombre entièrement noir.

---

## 3. Périmètre fonctionnel

### 3.1. Authentification

L’application est destinée à un usage personnel ou privé.

Le MVP doit inclure une authentification simple afin d’éviter qu’une personne non autorisée puisse créer ou modifier des trajets.

Fonctionnalités attendues :

- Connexion avec email et mot de passe.
- Déconnexion.
- Session persistante.
- Protection de toutes les pages de gestion.
- Mot de passe stocké sous forme de hash sécurisé.
- Aucun système d’inscription publique.
- Création du premier utilisateur administrateur par seed, variable d’environnement ou commande dédiée.
- Un seul rôle dans le MVP : `ADMIN`.

Une évolution future pourra permettre plusieurs utilisateurs.

---

## 4. Gestion des trajets

### 4.1. Création d’un trajet

L’utilisateur peut créer un trajet depuis un formulaire.

Champs :

| Champ | Obligatoire | Type | Contraintes |
|---|---:|---|---|
| Nom | Oui | Texte | 3 à 150 caractères |
| Description | Non | Texte long | 2 000 caractères maximum |
| Lien Google Maps | Oui | URL | Domaine Google Maps autorisé uniquement |
| Distance | Non | Nombre décimal | Exprimée en kilomètres, valeur positive |
| Durée | Non | Durée | Stockée en minutes |
| Image de couverture | Non | Fichier image | Fonctionnalité facultative pour le MVP |

Le lien Google Maps doit permettre d’ouvrir le trajet dans Google Maps depuis un ordinateur ou un téléphone.

Lors de la validation du formulaire :

1. L’API valide les données.
2. Le trajet est enregistré en base.
3. Un job de récupération de carte est créé.
4. Le trajet est immédiatement retourné au frontend.
5. Le traitement Selenium est exécuté de manière asynchrone.
6. L’utilisateur est redirigé vers la page de détail du trajet.

La création du trajet ne doit jamais attendre le résultat du worker Selenium.

---

### 4.2. Modification d’un trajet

L’utilisateur peut modifier :

- le nom ;
- la description ;
- le lien Google Maps ;
- la distance ;
- la durée ;
- l’image de couverture éventuelle.

Si le lien Google Maps est modifié :

1. l’ancien lien d’intégration est supprimé ;
2. le statut de récupération est remis à `PENDING` ;
3. un nouveau job est créé ;
4. la récupération est automatiquement relancée.

La modification du nom, de la description, de la distance ou de la durée ne doit pas relancer la récupération de la carte.

---

### 4.3. Suppression d’un trajet

L’utilisateur peut supprimer un trajet.

Comportement recommandé :

- suppression logique avec un champ `deletedAt` ;
- les trajets supprimés ne sont plus visibles dans les listes normales ;
- les jobs associés ne doivent plus être exécutés ;
- une restauration pourra être ajoutée ultérieurement.

Pour le MVP, une suppression définitive est acceptable si la suppression logique ajoute trop de complexité.

---

### 4.4. Liste des trajets

La page d’accueil affiche les trajets sous forme de cartes.

Chaque carte affiche au minimum :

- le nom ;
- une description tronquée ;
- la distance, si renseignée ;
- la durée, si renseignée ;
- le statut de la carte ;
- un bouton pour consulter le trajet ;
- un bouton pour ouvrir le trajet dans Google Maps ;
- une indication visuelle si la récupération est en cours ou en erreur.

Fonctionnalités de liste :

- affichage responsive ;
- tri par date de création ;
- tri par nom ;
- tri par distance ;
- recherche textuelle sur le nom et la description ;
- filtre par statut de récupération ;
- pagination ou chargement progressif ;
- état vide lorsqu’aucun trajet n’existe.

Ordre par défaut :

```text
createdAt DESC
```

---

### 4.5. Détail d’un trajet

La page de détail affiche :

- le nom ;
- la description complète ;
- la distance ;
- la durée ;
- la date de création ;
- la date de dernière modification ;
- le bouton `Ouvrir dans Google Maps` ;
- la zone d’affichage de la carte ;
- les actions de modification et de suppression ;
- les informations d’erreur éventuelles pour l’administrateur.

Le bouton `Ouvrir dans Google Maps` doit :

- utiliser le lien de partage original ;
- s’ouvrir dans un nouvel onglet sur ordinateur ;
- ouvrir l’application Google Maps sur mobile lorsque le système le permet ;
- inclure `rel="noopener noreferrer"`.

---

## 5. États de récupération de la carte

Le trajet doit posséder un statut de récupération explicite.

Valeurs possibles :

```text
PENDING
PROCESSING
SUCCESS
FAILED
```

### 5.1. État `PENDING`

Le job existe mais n’a pas encore été pris par le worker.

Affichage :

- loader ;
- message : `Récupération de la carte en attente`.

### 5.2. État `PROCESSING`

Le worker Selenium traite actuellement le trajet.

Affichage :

- loader ;
- message : `Récupération de la carte en cours`.

### 5.3. État `SUCCESS`

Le lien d’intégration a été récupéré.

Affichage :

- iframe Google Maps ;
- aucune information technique visible par défaut.

### 5.4. État `FAILED`

Toutes les tentatives ont échoué.

Affichage :

- message : `Une erreur est survenue pendant la récupération de la carte.`;
- bouton `Réessayer`;
- le bouton `Ouvrir dans Google Maps` reste disponible ;
- l’administrateur peut consulter le dernier message d’erreur.

Le frontend ne doit pas déterminer l’état à partir de `updatedAt`.

Le statut stocké en base est la source de vérité.

---

## 6. Récupération asynchrone du lien d’intégration

### 6.1. Principe général

Le traitement doit être exécuté dans un worker séparé de l’API.

Architecture :

```text
Frontend
    |
    v
API REST
    |
    v
Base de données
    |
    v
Queue en base de données
    |
    v
Worker Selenium
    |
    v
Google Maps
    |
    v
Mise à jour du trajet
```

Le worker doit être déployé comme un service distinct.

---

### 6.2. Queue en base de données

Le MVP utilise la base de données comme système de queue.

Aucun Redis n’est nécessaire dans la première version.

Une table dédiée doit gérer les jobs de récupération.

Exemple :

```text
map_embed_jobs
```

Champs recommandés :

| Champ | Type | Description |
|---|---|---|
| id | UUID ou entier | Identifiant du job |
| tripId | Clé étrangère | Trajet concerné |
| status | Enum | État du job |
| attempts | Entier | Nombre de tentatives effectuées |
| maxAttempts | Entier | Nombre maximal de tentatives |
| requestedAt | Date | Date de création du job |
| startedAt | Date nullable | Début du dernier traitement |
| completedAt | Date nullable | Date de réussite |
| failedAt | Date nullable | Date d’échec définitif |
| nextAttemptAt | Date | Date de la prochaine tentative |
| lastError | Texte nullable | Dernière erreur connue |
| createdAt | Date | Date de création |
| updatedAt | Date | Date de modification |

---

### 6.3. Cycle de traitement

Le worker fonctionne en boucle.

Pseudo-flux :

```text
1. Chercher un job PENDING dont nextAttemptAt <= maintenant.
2. Verrouiller le job.
3. Passer le job à PROCESSING.
4. Incrémenter attempts.
5. Lancer le navigateur.
6. Ouvrir le lien de partage.
7. Attendre le chargement de Google Maps.
8. Ouvrir le menu de partage.
9. Sélectionner l’onglet d’intégration.
10. Récupérer le src de l’iframe.
11. Valider l’URL récupérée.
12. Enregistrer l’URL dans le trajet.
13. Passer le job à SUCCESS.
14. Fermer proprement le navigateur.
```

En cas d’erreur :

```text
1. Enregistrer l’erreur.
2. Prendre une capture d’écran.
3. Fermer le navigateur.
4. Vérifier le nombre de tentatives.
5. Replanifier le job ou le passer à FAILED.
6. Envoyer un email en cas d’échec définitif.
```

---

### 6.4. Verrouillage des jobs

Deux workers ne doivent jamais traiter le même job simultanément.

Utiliser au choix :

- `SELECT ... FOR UPDATE SKIP LOCKED` ;
- un `UPDATE` atomique conditionnel ;
- une transaction avec verrou pessimiste.

Le worker ne poursuit le traitement que s’il a effectivement obtenu le verrou.

---

### 6.5. Politique de nouvelles tentatives

Valeur recommandée :

```text
maxAttempts = 3
```

Délais recommandés :

```text
Tentative 1 : immédiatement
Tentative 2 : 1 minute après le premier échec
Tentative 3 : 5 minutes après le deuxième échec
```

Après le troisième échec :

```text
status = FAILED
failedAt = maintenant
```

Un email est alors envoyé.

---

### 6.6. Détection des jobs bloqués

Un job ne doit pas rester indéfiniment en `PROCESSING`.

Un traitement périodique doit détecter les jobs dont :

```text
status = PROCESSING
startedAt < maintenant - 15 minutes
```

Ces jobs doivent être :

- soit remis en `PENDING` ;
- soit passés en `FAILED` si le nombre maximal de tentatives est atteint.

Le message d’erreur doit indiquer que le traitement a été interrompu ou bloqué.

---

## 7. Automatisation Selenium

### 7.1. Navigateur

Le worker utilise :

- Selenium ;
- Chrome ou Chromium ;
- mode headless ;
- taille de fenêtre fixe ;
- langue française de préférence ;
- profil navigateur temporaire et isolé.

Exemple de taille :

```text
1920 x 1080
```

Le worker doit pouvoir fonctionner dans Docker.

---

### 7.2. Étapes d’automatisation

Le worker doit :

1. suivre le lien raccourci Google Maps ;
2. attendre la redirection ;
3. attendre que la page soit interactive ;
4. gérer l’éventuelle bannière de consentement ;
5. détecter le bouton de partage ;
6. ouvrir la fenêtre de partage ;
7. sélectionner l’onglet d’intégration ;
8. récupérer le code iframe ou directement son attribut `src` ;
9. vérifier que l’URL commence par une origine Google autorisée ;
10. enregistrer uniquement l’URL d’intégration.

Ne jamais enregistrer le HTML complet de l’iframe.

Exemple de valeur stockée :

```text
https://www.google.com/maps/embed?pb=...
```

---

### 7.3. Robustesse des sélecteurs

Les sélecteurs Selenium doivent éviter autant que possible :

- les classes CSS générées ;
- les sélecteurs dépendant fortement de la structure du DOM ;
- les positions fixes dans la page.

Privilégier :

- les attributs ARIA ;
- les rôles ;
- les textes visibles ;
- les sélecteurs comportant plusieurs solutions de secours.

Prévoir plusieurs stratégies pour localiser chaque élément important.

Exemple logique :

```text
Essayer un sélecteur ARIA.
Sinon essayer un bouton contenant le texte "Partager".
Sinon essayer une liste de sélecteurs connus.
Sinon lever une erreur explicite.
```

---

### 7.4. Gestion du consentement

Le worker doit détecter les principales variantes de la fenêtre de consentement Google.

Actions possibles :

- accepter ;
- refuser les options facultatives ;
- continuer sans connexion.

Le worker ne doit jamais dépendre d’un compte Google connecté.

---

### 7.5. Capture d’écran en cas d’erreur

Lors d’un échec Selenium, enregistrer :

- une capture d’écran ;
- l’URL courante ;
- le titre de la page ;
- le message d’erreur ;
- éventuellement une copie limitée du HTML.

Les captures doivent être stockées dans un dossier dédié.

Exemple :

```text
/storage/selenium-errors/{jobId}/{timestamp}.png
```

Une politique de nettoyage doit supprimer les captures anciennes.

Valeur recommandée :

```text
conservation maximale : 30 jours
```

---

## 8. Validation et sécurité des URL

Le backend ne doit jamais transmettre une URL arbitraire au worker.

Domaines autorisés :

```text
maps.app.goo.gl
goo.gl
google.com
www.google.com
google.fr
www.google.fr
```

Le chemin doit correspondre à une URL Google Maps.

Exemples acceptés :

```text
https://maps.app.goo.gl/...
https://www.google.com/maps/...
https://goo.gl/maps/...
```

Exemples refusés :

```text
http://localhost
http://127.0.0.1
http://192.168.1.1
file:///etc/passwd
https://example.com
```

Mesures obligatoires :

- HTTPS obligatoire ;
- validation stricte du hostname ;
- interdiction des IP privées ;
- interdiction de `localhost` ;
- interdiction des schémas autres que HTTP et HTTPS ;
- nombre maximal de redirections ;
- timeout global ;
- taille maximale de réponse ;
- interdiction des téléchargements automatiques ;
- exécution du navigateur dans un conteneur isolé ;
- utilisateur Linux non-root dans le conteneur.

---

## 9. Polling frontend

Le frontend doit actualiser automatiquement l’état de la carte tant que le statut est :

```text
PENDING
PROCESSING
```

Fréquence recommandée :

```text
toutes les 5 secondes
```

Le polling doit s’arrêter lorsque le statut devient :

```text
SUCCESS
FAILED
```

Le polling doit également s’arrêter lorsque :

- le composant est démonté ;
- l’utilisateur quitte la page ;
- l’onglet est masqué pendant une longue période.

Aucun WebSocket n’est nécessaire pour le MVP.

---

## 10. Relance manuelle

Un trajet en erreur doit proposer un bouton :

```text
Réessayer
```

Endpoint recommandé :

```http
POST /trips/{id}/map/retry
```

Comportement :

1. vérifier que le trajet existe ;
2. vérifier qu’aucun job n’est déjà actif ;
3. remettre le statut à `PENDING` ;
4. remettre `attempts` à zéro ;
5. supprimer les anciennes informations d’échec ;
6. définir `nextAttemptAt` à maintenant ;
7. créer ou réinitialiser le job ;
8. redémarrer le polling frontend.

---

## 11. Notifications par email

### 11.1. Déclenchement

Un email est envoyé uniquement après l’échec définitif du job.

Ne pas envoyer un email après chaque tentative.

### 11.2. Destinataire

Le destinataire est défini dans une variable d’environnement :

```env
ADMIN_NOTIFICATION_EMAIL=
```

### 11.3. Contenu du mail

Le mail doit contenir :

- le nom du trajet ;
- l’identifiant du trajet ;
- l’identifiant du job ;
- le lien Google Maps ;
- le nombre de tentatives ;
- la dernière erreur ;
- l’URL actuelle du navigateur, si disponible ;
- la date et l’heure ;
- le chemin de la capture d’écran ou la capture en pièce jointe si possible.

Sujet recommandé :

```text
[Balades Moto] Échec de récupération Google Maps
```

---

## 12. API REST

### 12.1. Authentification

```http
POST /auth/login
POST /auth/logout
GET  /auth/me
```

### 12.2. Trajets

```http
GET    /trips
POST   /trips
GET    /trips/{id}
PATCH  /trips/{id}
DELETE /trips/{id}
POST   /trips/{id}/map/retry
```

### 12.3. Paramètres de liste

Exemple :

```http
GET /trips?page=1&limit=20&search=cevennes&status=SUCCESS&sort=createdAt&order=desc
```

### 12.4. Réponse d’un trajet

Exemple :

```json
{
  "id": "4edb5dd1-89da-40d7-9283-9c87a6dc2ea5",
  "name": "Boucle des Cévennes",
  "description": "Balade avec passage par le Vigan et l'Espérou.",
  "googleMapsUrl": "https://maps.app.goo.gl/example",
  "mapEmbedUrl": null,
  "distanceKm": 224.5,
  "durationMinutes": 270,
  "mapStatus": "PROCESSING",
  "mapLastError": null,
  "createdAt": "2026-08-01T14:00:00.000Z",
  "updatedAt": "2026-08-01T14:01:00.000Z"
}
```

Les informations techniques sensibles ne doivent être retournées qu’à l’administrateur authentifié.

---

## 13. Modèle de données

### 13.1. User

```text
id
email
passwordHash
role
createdAt
updatedAt
```

### 13.2. Trip

```text
id
name
description
googleMapsUrl
mapEmbedUrl
distanceKm
durationMinutes
mapStatus
mapLastError
createdAt
updatedAt
deletedAt
```

### 13.3. MapEmbedJob

```text
id
tripId
status
attempts
maxAttempts
requestedAt
startedAt
completedAt
failedAt
nextAttemptAt
lastError
createdAt
updatedAt
```

### 13.4. Relations

```text
Trip 1 --- N MapEmbedJob
```

Il est recommandé de conserver l’historique des jobs plutôt que de réutiliser toujours la même ligne.

Un seul job actif est autorisé par trajet.

---

## 14. Stack technique recommandée

### 14.1. Monorepo

```text
pnpm workspaces
```

Structure possible :

```text
apps/
  frontend/
  api/
  maps-worker/

packages/
  shared/
  contracts/
  eslint-config/
  tsconfig/
```

### 14.2. Frontend

- React.
- Vite.
- TypeScript strict.
- React Router.
- TanStack Query.
- React Hook Form.
- Zod.
- Tailwind CSS.
- shadcn/ui.
- Lucide React pour les icônes.
- Sonner pour les notifications.
- date-fns pour les dates.

### 14.3. Backend

- NestJS.
- TypeScript strict.
- Prisma ORM.
- MariaDB.
- Zod ou class-validator pour les entrées.
- JWT dans un cookie HTTP-only ou session sécurisée.
- Nodemailer pour les emails.
- Swagger/OpenAPI.

### 14.4. Worker

- Node.js.
- TypeScript.
- Selenium WebDriver.
- Chrome ou Chromium headless.
- Prisma pour l’accès à la base.
- Nodemailer ou appel d’un service interne de notification.

### 14.5. Infrastructure

- Docker.
- Docker Compose.
- MariaDB.
- Nginx ou reverse proxy fourni par la plateforme de déploiement.
- Volumes persistants pour la base et les captures Selenium.

---

## 15. Docker Compose

Services attendus :

```text
frontend
api
maps-worker
database
```

Tous les services persistants doivent utiliser :

```yaml
restart: unless-stopped
```

Le fichier `docker-compose.yml` ne doit pas contenir d’attribut `version`.

Le worker doit dépendre de la base de données.

La disponibilité de la base doit être vérifiée avec un healthcheck.

Les secrets doivent être fournis par variables d’environnement.

Aucun mot de passe ou token ne doit être écrit directement dans le dépôt.

---

## 16. Variables d’environnement

Exemple non exhaustif :

```env
NODE_ENV=production

DATABASE_URL=
JWT_SECRET=

ADMIN_EMAIL=
ADMIN_PASSWORD=

ADMIN_NOTIFICATION_EMAIL=

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

SELENIUM_HEADLESS=true
SELENIUM_TIMEOUT_MS=60000
SELENIUM_MAX_ATTEMPTS=3
SELENIUM_SCREENSHOT_DIR=/storage/selenium-errors

FRONTEND_URL=
API_URL=
```

Un fichier `.env.example` doit être présent.

Le fichier `.env` réel doit être ignoré par Git.

---

## 17. Design général

### 17.1. Principes

L’interface doit être :

- moderne ;
- sobre ;
- claire ;
- orientée mobile ;
- entièrement responsive ;
- facile à utiliser avec des gants retirés mais sur un écran de téléphone ;
- lisible en extérieur ;
- cohérente en thème clair et sombre.

Éviter :

- les interfaces surchargées ;
- les animations excessives ;
- les textes trop petits ;
- les contrastes faibles ;
- les cartes trop compactes ;
- le noir pur comme fond principal du thème sombre.

---

## 18. Responsive design

L’application doit être pensée en mobile-first.

Breakpoints suggérés :

```text
sm : 640 px
md : 768 px
lg : 1024 px
xl : 1280 px
2xl : 1536 px
```

### 18.1. Mobile

Sur mobile :

- navigation compacte ;
- formulaire sur une seule colonne ;
- boutons principaux en pleine largeur lorsque pertinent ;
- carte affichée sur toute la largeur ;
- hauteur d’iframe adaptée à la taille de l’écran ;
- actions suffisamment grandes pour être utilisées facilement ;
- aucune barre de défilement horizontale ;
- cartes de trajet sur une seule colonne ;
- bouton Google Maps très visible.

### 18.2. Tablette

Sur tablette :

- grille de deux colonnes pour la liste ;
- formulaire avec quelques champs côte à côte ;
- iframe plus haute ;
- navigation toujours compacte.

### 18.3. Bureau

Sur ordinateur :

- grille de deux à quatre colonnes selon la largeur ;
- page de détail en deux colonnes lorsque possible ;
- informations à gauche, carte à droite ;
- largeur maximale du contenu ;
- marges généreuses.

---

## 19. Thème clair

Caractéristiques :

- fond général blanc cassé ou gris très clair ;
- cartes blanches ;
- bordures légères ;
- texte principal foncé ;
- accent coloré lié à l’univers moto ou route ;
- contrastes conformes aux bonnes pratiques d’accessibilité.

Exemples d’intention visuelle :

```text
Fond : gris très clair
Surface : blanc
Texte : gris anthracite
Accent : vert, bleu ou orange maîtrisé
```

---

## 20. Thème sombre

Le thème sombre ne doit pas utiliser de fond noir pur.

Interdictions :

```text
#000000 comme fond principal
cartes totalement noires
contraste blanc pur agressif partout
```

Intention visuelle recommandée :

```text
Fond principal : gris ardoise foncé
Surface : gris légèrement plus clair
Bordures : gris ardoise intermédiaire
Texte principal : blanc cassé
Texte secondaire : gris clair
Accent : couleur identique au thème clair
```

Exemples possibles :

```text
Fond principal proche de #171A1F
Surface proche de #20242B
Surface secondaire proche de #292E36
Texte principal proche de #F1F3F5
Texte secondaire proche de #AEB5BF
```

Ces valeurs sont indicatives et peuvent être adaptées.

---

## 21. Gestion du thème

Fonctionnalités :

- bouton de bascule clair/sombre ;
- prise en charge de la préférence système ;
- persistance du choix utilisateur ;
- absence de flash incorrect au chargement ;
- icône claire pour le changement de thème.

Valeurs possibles :

```text
light
dark
system
```

La préférence peut être stockée dans `localStorage`.

---

## 22. Composants d’interface

Composants principaux :

- `AppShell`
- `Header`
- `MobileNavigation`
- `ThemeToggle`
- `TripCard`
- `TripList`
- `TripForm`
- `TripDetails`
- `MapPreview`
- `MapLoadingState`
- `MapErrorState`
- `DeleteTripDialog`
- `RetryMapButton`
- `EmptyState`
- `SearchInput`
- `StatusBadge`
- `Pagination`
- `Toast`

---

## 23. Affichage de la carte

### 23.1. État en cours

Afficher un skeleton ou loader dans un conteneur ayant approximativement les dimensions finales de la carte.

Le layout ne doit pas sauter lorsque l’iframe apparaît.

### 23.2. État réussi

Iframe recommandée :

```tsx
<iframe
  src={trip.mapEmbedUrl}
  title={`Carte du trajet ${trip.name}`}
  loading="lazy"
  allowFullScreen
  referrerPolicy="strict-origin-when-cross-origin"
/>
```

Contraintes :

- largeur `100%` ;
- bordure supprimée ;
- coins arrondis ;
- hauteur responsive ;
- URL provenant uniquement de la base après validation ;
- aucun HTML brut injecté.

### 23.3. État en erreur

Afficher :

- une icône d’avertissement ;
- un message compréhensible ;
- un bouton `Réessayer` ;
- un bouton `Ouvrir dans Google Maps`.

Ne pas afficher une stack trace dans l’interface utilisateur.

---

## 24. Expérience utilisateur

### 24.1. Création

Après validation du formulaire :

- afficher une notification de succès ;
- rediriger vers le détail du trajet ;
- afficher immédiatement l’état de récupération ;
- commencer automatiquement le polling.

### 24.2. Modification

Après modification :

- afficher une notification ;
- conserver l’utilisateur sur la page pertinente ;
- relancer la récupération uniquement si le lien Maps change.

### 24.3. Suppression

Avant suppression :

- afficher une boîte de confirmation ;
- mentionner clairement le nom du trajet ;
- demander une confirmation explicite.

### 24.4. Erreurs API

Toutes les erreurs doivent être affichées proprement.

Exemples :

- lien Google Maps invalide ;
- serveur indisponible ;
- échec de connexion ;
- trajet introuvable ;
- job déjà en cours ;
- récupération échouée.

---

## 25. Accessibilité

Exigences minimales :

- navigation au clavier ;
- focus visible ;
- labels associés aux champs ;
- textes alternatifs pour les images ;
- contrastes suffisants ;
- boutons avec intitulés explicites ;
- iframe avec attribut `title` ;
- messages de chargement accessibles ;
- ne pas transmettre l’information uniquement par la couleur.

---

## 26. Gestion des erreurs et logs

### 26.1. API

Les logs doivent inclure :

- méthode HTTP ;
- route ;
- statut ;
- durée ;
- identifiant utilisateur ;
- identifiant de corrélation.

### 26.2. Worker

Les logs doivent inclure :

- identifiant du job ;
- identifiant du trajet ;
- numéro de tentative ;
- étape Selenium courante ;
- durée du traitement ;
- résultat ;
- message d’erreur.

Ne jamais logger :

- les mots de passe ;
- les secrets ;
- les tokens JWT ;
- les informations SMTP sensibles.

---

## 27. Tests

### 27.1. Backend

Tests unitaires :

- validation d’URL ;
- création de trajet ;
- modification de trajet ;
- changement de lien ;
- création de job ;
- relance de job ;
- calcul des nouvelles tentatives ;
- détection des jobs bloqués.

Tests d’intégration :

- endpoints REST ;
- authentification ;
- transaction de création ;
- verrouillage des jobs ;
- échec définitif ;
- envoi de notification.

### 27.2. Worker

Prévoir une abstraction autour de Selenium afin de pouvoir simuler :

- une récupération réussie ;
- un bouton de partage introuvable ;
- une popup de consentement ;
- une iframe absente ;
- un timeout ;
- une redirection invalide ;
- un crash du navigateur.

Les tests automatisés ne doivent pas dépendre systématiquement du vrai site Google Maps.

### 27.3. Frontend

Tester :

- formulaire ;
- validation ;
- affichage de chaque statut ;
- polling ;
- arrêt du polling ;
- relance manuelle ;
- changement de thème ;
- responsive principal ;
- boutons Google Maps.

---

## 28. Qualité du code

Règles :

- TypeScript en mode strict ;
- aucune utilisation injustifiée de `any` ;
- séparation claire des responsabilités ;
- composants frontend courts ;
- logique métier hors des composants React ;
- services dédiés ;
- DTO explicites ;
- validation côté frontend et backend ;
- gestion centralisée des erreurs ;
- variables et fonctions nommées en anglais ;
- interface utilisateur en français ;
- formatage automatique ;
- lint obligatoire ;
- hooks Git facultatifs ;
- documentation des parties Selenium fragiles.

---

## 29. Conventions Git

Branches recommandées :

```text
main
develop
feature/*
fix/*
```

Commits conventionnels :

```text
feat:
fix:
refactor:
test:
docs:
chore:
```

Chaque fonctionnalité importante doit être isolée dans une branche.

---

## 30. Documentation attendue

Le dépôt doit inclure :

- `README.md` ;
- instructions d’installation ;
- instructions de développement ;
- variables d’environnement ;
- lancement Docker ;
- lancement du worker ;
- procédure de création du premier administrateur ;
- description de l’architecture ;
- explication de la queue en base ;
- procédure de diagnostic Selenium ;
- emplacement des captures d’erreur ;
- procédure de relance manuelle ;
- documentation Swagger.

---

## 31. Critères d’acceptation du MVP

Le MVP est considéré comme terminé lorsque :

1. un administrateur peut se connecter ;
2. un trajet peut être créé avec un lien Google Maps ;
3. la création répond immédiatement ;
4. un job asynchrone est créé ;
5. le worker récupère automatiquement le lien d’intégration ;
6. l’iframe apparaît sans rechargement manuel ;
7. le bouton Google Maps ouvre le lien original ;
8. les statuts `PENDING`, `PROCESSING`, `SUCCESS` et `FAILED` sont correctement affichés ;
9. un job échoué peut être relancé ;
10. un email est envoyé après l’échec définitif ;
11. les URLs non autorisées sont rejetées ;
12. deux workers ne peuvent pas traiter le même job ;
13. un job bloqué est détecté ;
14. l’application fonctionne sur mobile, tablette et ordinateur ;
15. les thèmes clair et sombre sont disponibles ;
16. le thème sombre n’utilise pas de noir pur ;
17. le choix du thème est persisté ;
18. le projet fonctionne avec Docker Compose ;
19. aucune information secrète n’est présente dans le dépôt ;
20. la documentation permet de lancer le projet sans connaissance préalable.

---

## 32. Évolutions futures

Fonctionnalités hors MVP pouvant être ajoutées plus tard :

- catégories de balades ;
- favoris ;
- tags ;
- difficulté ;
- type de route ;
- région ;
- image de couverture automatique ;
- statistiques ;
- export GPX ;
- import GPX ;
- historique des balades réalisées ;
- notation personnelle ;
- partage public d’un trajet ;
- plusieurs utilisateurs ;
- commentaires ;
- météo sur le parcours ;
- duplication d’un trajet ;
- archivage ;
- détection automatique de la distance et de la durée ;
- récupération automatique des étapes ;
- notifications push ;
- application mobile PWA ;
- fonctionnement hors ligne ;
- synchronisation avec un calendrier ;
- Redis et BullMQ si le volume de jobs augmente.

---

## 33. Priorités de développement

### Phase 1 — Base du projet

- monorepo ;
- frontend ;
- API ;
- base de données ;
- Docker ;
- authentification ;
- modèle `Trip`.

### Phase 2 — CRUD des trajets

- création ;
- liste ;
- détail ;
- modification ;
- suppression ;
- responsive initial.

### Phase 3 — Jobs asynchrones

- table de jobs ;
- worker ;
- verrouillage ;
- polling frontend ;
- statuts.

### Phase 4 — Selenium

- ouverture du lien ;
- gestion du consentement ;
- récupération de l’iframe ;
- stockage du lien ;
- captures d’erreur.

### Phase 5 — Robustesse

- nouvelles tentatives ;
- jobs bloqués ;
- emails ;
- relance manuelle ;
- sécurité des URL.

### Phase 6 — Design final

- thème clair ;
- thème sombre ;
- responsive complet ;
- accessibilité ;
- états vides ;
- loaders ;
- finitions UX.

### Phase 7 — Tests et documentation

- tests ;
- Swagger ;
- README ;
- procédures de diagnostic ;
- validation des critères d’acceptation.
