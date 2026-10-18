# Backend d'authentification pour un exercice

Ce projet fournit uniquement une API Node.js / Express avec inscription, connexion et vérification JWT. Les comptes sont conservés dans SQLite. Il ne contient pas de frontend.

## Prérequis et lancement

- Node.js 20 ou plus récent
- npm

Installez les dépendances :

```bash
npm install
```

Créez `.env` depuis l'exemple seulement s'il n'existe pas, puis définissez un secret JWT privé :

```bash
if [ ! -f .env ]; then cp .env.example .env; fi
```

`JWT_SECRET` est obligatoire. En local, le port par défaut est `3000`. En production, l'application doit écouter sur `3999` pour correspondre au Caddyfile.

Lancez en développement :

```bash
npm run dev
```

Lancez avec PM2 en production depuis le dossier du projet :

```bash
PORT=3999 pm2 start npm --name authri7 -- run start
```

La base est créée automatiquement dans `data/auth.sqlite`. Le processus PM2 doit pouvoir écrire dans `data/`. Le fichier est ignoré par Git et reste présent au redémarrage du serveur ; prévoyez une sauvegarde si les comptes doivent être conservés.

## Swagger

Swagger UI est disponible en local sur `http://localhost:3000/api-docs` et en production sur `https://<votre-domaine>/api-docs`.

Pour essayer le parcours complet :

1. Exécutez `POST /api/register` avec un nom d'utilisateur et un mot de passe valides.
2. Copiez le champ `token` de la réponse.
3. Cliquez sur **Authorize** et collez le JWT seul, sans ajouter `Bearer`.
4. Exécutez `GET /api/me`.

## Routes

### `POST /api/register`

Crée un compte et renvoie un JWT. Exemple de corps :

```json
{ "username": "alice", "password": "mot-de-passe-123" }
```

Le nom d'utilisateur est nettoyé des espaces autour, doit faire 3 à 32 caractères et ne contenir que des lettres ASCII, chiffres, `_`, `.` ou `-`. Le mot de passe doit avoir au moins 8 caractères et ne pas dépasser 72 octets en UTF-8. Il est stocké sous forme de hash bcrypt.

En cas de succès, la réponse `201` ressemble à ceci :

```json
{
  "user": { "username": "alice" },
  "token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Corps invalide : `400 { "error": "invalid_request" }`. Nom d'utilisateur déjà utilisé (insensible à la casse) : `409 { "error": "username_taken" }`.

### `POST /api/login`

Vérifie un compte existant dans SQLite avec le mot de passe fourni :

```json
{ "username": "alice", "password": "mot-de-passe-123" }
```

En cas de succès, la réponse `200` contient `{ "token": "<jwt>", "token_type": "Bearer", "expires_in": 3600 }`. Un corps invalide reçoit `400 { "error": "invalid_request" }`. Un nom d'utilisateur inconnu ou un mot de passe incorrect reçoit le même `401 { "error": "invalid_credentials" }`.

### `GET /api/me`

Envoyez le JWT dans l'en-tête :

```http
Authorization: Bearer <jwt>
```

Réponse `200` :

```json
{ "user": { "username": "alice" } }
```

Un jeton absent, mal formé, expiré ou invalide reçoit `401 { "error": "unauthorized" }`.

## Exemple avec curl

Créer le compte et récupérer le JWT :

```bash
TOKEN=$(curl -s http://localhost:3000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"mot-de-passe-123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).token')
```

Appeler ensuite la route protégée :

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer $TOKEN"
```

Pour le hook `useAuth()`, le client doit conserver le jeton reçu à l'inscription ou à la connexion et l'envoyer dans l'en-tête `Authorization: Bearer <token>`.
