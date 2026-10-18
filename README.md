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

La base est créée automatiquement dans `data/auth.sqlite`. Au démarrage, une ancienne base est migrée vers une table sans nom d'utilisateur, avec l'adresse e-mail comme identifiant unique. Les comptes historiques sans adresse e-mail ne peuvent plus se connecter. Le processus PM2 doit pouvoir écrire dans `data/`. Le fichier est ignoré par Git et reste présent au redémarrage du serveur ; prévoyez une sauvegarde si les comptes doivent être conservés.

## Swagger

Swagger UI est disponible en local sur `http://localhost:3000/api-docs` et en production sur `https://<votre-domaine>/api-docs`.

Pour essayer le parcours complet :

1. Exécutez `POST /api/register` avec une adresse e-mail et un mot de passe valides.
2. Copiez le champ `token` de la réponse.
3. Cliquez sur **Authorize** et collez le JWT seul, sans ajouter `Bearer`.
4. Exécutez `GET /api/me`.

## Routes

Les erreurs JSON contiennent toujours un code stable `error` et un message lisible `message`. Pour les champs invalides, `details` liste chaque champ à corriger avec sa mesure et la règle attendue. Le client peut afficher `message` ou présenter chaque entrée de `details` près du champ concerné.

Exemple :

```json
{
  "error": "invalid_request",
  "message": "La requête contient des champs invalides. Consultez details pour savoir quoi corriger.",
  "details": [
    {
      "field": "password",
      "code": "too_short",
      "message": "Le mot de passe contient 5 caractères; le minimum est de 8."
    }
  ]
}
```

### `POST /api/register`

Crée un compte et renvoie un JWT. Exemple de corps :

```json
{ "email": "alice@example.fr", "password": "mot-de-passe-123" }
```

L'adresse e-mail est nettoyée des espaces autour, convertie en minuscules, limitée à 254 caractères et doit ressembler à `nom@exemple.fr`. Elle est l'unique identifiant du compte et doit être unique. Le mot de passe doit avoir au moins 8 caractères et ne pas dépasser 72 octets en UTF-8. Il est stocké sous forme de hash bcrypt.

L'adresse n'est pas confirmée par e-mail : l'API ne vérifie pas que l'utilisateur la contrôle.

En cas de succès, la réponse `201` ressemble à ceci :

```json
{
  "user": { "email": "alice@example.fr" },
  "token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

Un champ absent ou invalide reçoit `400` avec `error: "invalid_request"`, un message et une entrée par erreur dans `details`. Les détails indiquent le nombre de caractères ou d'octets reçu et la limite attendue. Adresse e-mail déjà utilisée : `409 { "error": "email_taken", "message": "...", "details": [...] }`.

### `POST /api/login`

Les nouveaux comptes peuvent se connecter avec leur adresse e-mail et leur mot de passe :

```json
{ "email": "alice@example.fr", "password": "mot-de-passe-123" }
```

En cas de succès, la réponse `200` contient `{ "token": "<jwt>", "token_type": "Bearer", "expires_in": 3600 }`. Les champs absents ou invalides reçoivent `400` avec les détails de validation. Une adresse e-mail inconnue ou un mot de passe incorrect reçoit le même `401 { "error": "invalid_credentials", "message": "..." }` afin de ne pas révéler si le compte existe.

### `GET /api/me`

Envoyez le JWT dans l'en-tête :

```http
Authorization: Bearer <jwt>
```

Réponse `200` :

```json
{ "user": { "email": "alice@example.fr" } }
```

Un jeton absent, mal formé, expiré ou invalide reçoit `401 { "error": "unauthorized", "message": "..." }`. Le message précise le cas et rappelle le format `Authorization: Bearer <token>` lorsque l'en-tête manque ou est mal formé.

Une route inexistante renvoie `404` avec `error: "not_found"` et son nom. Un JSON mal formé reçoit `400`; le corps est limité à 102400 octets (`413` au-delà), et les encodages/jeux de caractères non pris en charge reçoivent `415`. Les erreurs serveur restent génériques (`500`) et ne révèlent pas de détails internes.

## Exemple avec curl

Créer le compte et récupérer le JWT :

```bash
TOKEN=$(curl -s http://localhost:3000/api/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.fr","password":"mot-de-passe-123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).token')
```

Appeler ensuite la route protégée :

```bash
curl http://localhost:3000/api/me \
  -H "Authorization: Bearer $TOKEN"
```

Pour le hook `useAuth()`, le client doit conserver le jeton reçu à l'inscription ou à la connexion et l'envoyer dans l'en-tête `Authorization: Bearer <token>`.
