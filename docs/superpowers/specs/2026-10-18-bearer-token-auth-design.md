# Backend d'authentification par jeton Bearer

## Objectif

Fournir un backend pédagogique uniquement, sans interface ni base de données, qui permet aux étudiants de comprendre comment obtenir un jeton puis l'envoyer pour récupérer l'utilisateur courant dans leur hook `useAuth()`.

## Choix retenu

Utiliser Node.js et Express, avec un JWT signé et transmis par l'en-tête HTTP `Authorization: Bearer <token>`. Cette approche rend explicite, dans l'exercice, l'endroit où le frontend doit lire et transmettre le jeton. Les deux autres options envisagées étaient un jeton opaque conservé en mémoire (qui disparaît au redémarrage) et un JWT en cookie (qui cache le mécanisme de l'en-tête).

Le serveur ne possède ni compte stocké en base ni frontend. Le compte pédagogique est configurable avec `ADMIN_USERNAME` et `ADMIN_PASSWORD`, qui valent respectivement `admin` et `password` par défaut. `JWT_SECRET` est fourni par l'environnement et requis au démarrage. Le JWT expire après une heure.

## Routes et échanges

### `POST /api/login`

Accepte un corps JSON de la forme :

```json
{ "username": "admin", "password": "password" }
```

Si les identifiants correspondent, répond `200` avec :

```json
{ "token": "<jwt>", "token_type": "Bearer", "expires_in": 3600 }
```

Un corps absent ou invalide reçoit `400`. Des identifiants incorrects reçoivent `401` avec une réponse JSON explicite.

### `GET /api/me`

Attend l'en-tête :

```http
Authorization: Bearer <jwt>
```

Après validation de la signature et de l'expiration, répond `200` avec :

```json
{ "user": { "username": "admin" } }
```

Un en-tête manquant, mal formé, expiré ou signé avec un autre secret reçoit `401` en JSON.

## Structure prévue

- `package.json` : scripts et dépendances Node.js/Express/JWT.
- `src/server.js` : création de l'application Express, routes et démarrage.
- `.env.example` : variables nécessaires à l'exécution locale.
- `README.md` : installation, lancement, contrat HTTP et exemples `curl` montrant la connexion puis l'appel à `/api/me` avec le Bearer token.

## Hors périmètre

Pas de code frontend, de stockage en base, de création de comptes, de renouvellement de jetons ni de fonctionnalités de production comme le hachage d'un mot de passe utilisateur. Les identifiants statiques sont réservés à l'exercice et ne doivent pas être présentés comme une authentification de production.
