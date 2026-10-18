# Backend d'authentification pour un exercice

Ce projet fournit uniquement un backend Node.js / Express. Il ne contient ni interface frontend ni base de données.

## Prérequis et lancement

- Node.js 20 ou plus récent
- npm

Installez les dépendances :

```bash
npm install
```

Créez un fichier `.env` à partir de l'exemple s'il n'existe pas déjà, puis remplacez la valeur d'exemple de `JWT_SECRET` par une valeur privée :

```bash
if [ ! -f .env ]; then cp .env.example .env; fi
```

Le secret est obligatoire. Le serveur refuse de démarrer si `JWT_SECRET` est vide ou absent. Les variables `ADMIN_USERNAME` et `ADMIN_PASSWORD` valent `admin` et `password` par défaut. Le port vaut `3000` par défaut.

Démarrez le serveur :

```bash
npm run dev
```

## Routes

### `POST /api/login`

Corps JSON :

```json
{ "username": "admin", "password": "password" }
```

En cas de succès, la réponse `200` contient un jeton valable une heure :

```json
{ "token": "<jwt>", "token_type": "Bearer", "expires_in": 3600 }
```

Un corps JSON invalide renvoie `400` :

```json
{ "error": "invalid_request" }
```

Des identifiants incorrects renvoient `401` sans préciser lequel ne correspond pas :

```json
{ "error": "invalid_credentials" }
```

### `GET /api/me`

Envoyez le jeton dans l'en-tête `Authorization` avec le type `Bearer` :

```http
Authorization: Bearer <jwt>
```

Un jeton valide renvoie `200` :

```json
{ "user": { "username": "admin" } }
```

Un jeton absent, mal formé, expiré ou invalide renvoie `401` :

```json
{ "error": "unauthorized" }
```

## Exemple d'appels

Connexion et extraction du jeton avec `curl` :

```bash
TOKEN=$(curl -s http://localhost:3000/api/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"password"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).token')
```

Appel de la route protégée avec ce jeton :

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer $TOKEN"
```

Dans l'exercice frontend, le client doit récupérer le jeton renvoyé par `POST /api/login`, le conserver, puis l'envoyer dans l'en-tête `Authorization: Bearer <token>` lors de l'appel à `/api/me`. À vous de décider où le conserver dans le hook `useAuth()`.

> Les identifiants par défaut sont destinés à un exercice en classe uniquement. Cette authentification statique n'est pas adaptée à une application de production.
