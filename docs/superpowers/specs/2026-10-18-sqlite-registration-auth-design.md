# Inscription et authentification avec SQLite

## Objectif

Ajouter une inscription persistante au backend pédagogique. Les comptes créés par les étudiants sont stockés dans SQLite, leurs mots de passe sont hashés, et les routes existantes de connexion, profil et Swagger continuent de fonctionner.

## Architecture

- SQLite est le stockage des utilisateurs, dans `data/auth.sqlite`, sous le répertoire du projet. Le répertoire et le fichier de base ne sont pas suivis par Git. Au démarrage, une base existante reçoit une colonne e-mail et un index unique sans suppression des comptes historiques.
- `better-sqlite3` ouvre la base et crée la table au démarrage avec `CREATE TABLE IF NOT EXISTS`. La table contient un identifiant, un nom d'utilisateur unique sans distinction de casse, un e-mail normalisé unique lorsqu'il est renseigné, un hash de mot de passe et une date de création. Les requêtes utilisent des paramètres préparés. Les comptes historiques peuvent avoir un e-mail nul.
- `bcryptjs` hash les mots de passe de façon asynchrone avec 12 rounds et les vérifie lors de la connexion. Aucun mot de passe en clair ou hash ne figure dans les réponses HTTP.
- La base commence vide. Il n'y a pas de compte `admin/password` précréé : le premier compte est créé par `POST /api/register`. La connexion statique basée sur `ADMIN_USERNAME` et `ADMIN_PASSWORD` est retirée.
- Les JWT restent signés en HS256 avec `JWT_SECRET` et expirent après une heure. Ils portent l'identifiant du compte dans `sub`, son nom d'utilisateur et son e-mail lorsqu'il en a un. La réponse de `GET /api/me` comprend username et email pour les comptes récents; les jetons historiques peuvent ne pas contenir email.

## Organisation des fichiers

- `src/app.js` construit Express, ajoute les middlewares JSON et Swagger et monte les routeurs.
- `src/server.js` charge l'environnement, vérifie `JWT_SECRET`, puis écoute sur `PORT` (défaut `3000`).
- `src/routes/auth.routes.js` contient `POST /api/register` et `POST /api/login`.
- `src/routes/me.routes.js` contient `GET /api/me`.
- `src/middleware/require-auth.js` extrait et vérifie le jeton Bearer.
- `src/db/database.js` initialise SQLite et expose les opérations utilisateur préparées.
- `src/openapi.js` décrit les trois routes pour Swagger UI.
- `README.md` documente l'installation, le stockage persistant et les appels d'inscription, de connexion et de profil.

## Contrats HTTP

### `POST /api/register`

Accepte `{ "username": "alice", "email": "alice@example.fr", "password": "mot-de-passe" }`.

- Le nom d'utilisateur est supprimé des espaces de début/fin, doit faire 3 à 32 caractères et correspondre à `^[A-Za-z0-9_.-]+$`.
- L'e-mail est obligatoire, supprimé des espaces autour, converti en minuscules, limité à 254 caractères et doit ressembler à `nom@exemple.fr`. Il est unique sans distinction de casse. Aucune vérification par e-mail n'est envoyée.
- Le mot de passe doit contenir au moins 8 caractères et au maximum 72 octets UTF-8, limite de bcrypt.
- Réussite : `201` avec `{ "user": { "username": "alice", "email": "alice@example.fr" }, "token": "<jwt>", "token_type": "Bearer", "expires_in": 3600 }`.
- Corps invalide : `400` avec `{ "error": "invalid_request", "message": "...", "details": [{ "field": "...", "code": "...", "message": "..." }] }`. Les détails indiquent les champs concernés, la valeur mesurée et les limites attendues.
- Nom d'utilisateur ou e-mail déjà pris, sans distinction de casse : `409` avec `username_taken` ou `email_taken` et les détails du champ.

### `POST /api/login`

Accepte uniquement `{ "email": "alice@example.fr", "password": "mot-de-passe" }`. La connexion par username n'est pas autorisée. Cherche l'e-mail en minuscules dans SQLite et compare le mot de passe au hash bcrypt de manière asynchrone. Réussite : `200` avec `{ "token": "<jwt>", "token_type": "Bearer", "expires_in": 3600 }`. Les champs invalides reçoivent `400` avec un message et un détail par champ. Compte absent ou mot de passe erroné : `401` avec `{ "error": "invalid_credentials", "message": "..." }` (même réponse pour ne pas révéler si le compte existe).

### `GET /api/me`

Garde l'en-tête `Authorization: Bearer <jwt>`. Le middleware vérifie signature, algorithme et expiration, puis le handler répond `200` avec `{ "user": { "username": "alice", "email": "alice@example.fr" } }` lorsque le jeton contient l'e-mail. Un jeton absent, mal formé, expiré ou invalide reçoit `401` avec `{ "error": "unauthorized", "message": "..." }`, le message décrit le cas et rappelle la correction attendue.

## Swagger et déploiement

Swagger UI reste disponible sur `/api-docs` en production. Sa spécification documente l'inscription, les réponses d'erreur, la sécurité Bearer et l'ordre d'essai : inscription ou connexion, autorisation, puis `/api/me`. La base SQLite reste sur disque à travers les redémarrages PM2 ; le README précise que le processus PM2 doit avoir accès en écriture au dossier `data/`.

## Hors périmètre

Pas de vérification de l'adresse e-mail, de rôles, de réinitialisation de mot de passe, de révocation/renouvellement de jeton ni d'inscription avec des privilèges administrateur. Le backend reste un exercice pédagogique et ne promet pas les contrôles d'abus d'un service de production.
