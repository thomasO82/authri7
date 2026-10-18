const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Authri7 — API d'authentification",
    version: "1.0.0",
    description: `
API pédagogique d'inscription, de connexion et de vérification d'un JWT Bearer.

### Parcours conseillé

1. Créez un compte avec **POST /api/register**, ou connectez-vous avec **POST /api/login**.
2. Copiez le champ **token** renvoyé par l'API.
3. Cliquez sur **Authorize**, collez le jeton seul (sans écrire le préfixe Bearer), puis validez.
4. Essayez **GET /api/me** : Swagger ajoutera automatiquement l'en-tête Authorization avec le schéma Bearer.

Le jeton expire après **3600 secondes (1 heure)**. Les mots de passe ne sont jamais renvoyés par l'API; ils sont stockés sous forme de hash.

Les JWT utilisent HS256 et doivent être signés avec le secret configuré côté serveur. Ils contiennent l'identifiant du compte dans sub, le nom d'utilisateur et l'adresse e-mail lorsqu'elle existe. Le backend requiert JWT_SECRET; PORT est facultatif (3000 par défaut, 3999 en production). Swagger UI est disponible sur /api-docs. Les comptes sont persistés dans data/auth.sqlite.

L'adresse e-mail est enregistrée et constitue l'unique identifiant de connexion. Elle est normalisée en minuscules, mais elle n'est pas vérifiée par envoi d'un courriel : ce backend ne dispose pas de service d'envoi ni de procédure de vérification d'adresse.

### Format des erreurs

Les erreurs JSON ont un code stable dans le champ error et une explication lisible dans le champ message. Les erreurs de validation ajoutent details, avec une entrée par champ invalide. Le message de chaque détail précise la valeur reçue et la contrainte attendue lorsque cela s'applique.

Une URL ou une méthode non déclarée par l'API renvoie 404 avec error égal à not_found et le chemin demandé dans message. Les erreurs internes renvoient 500 sans détails techniques.
    `.trim(),
  },
  servers: [
    {
      url: "/",
      description: "Même origine que Swagger UI, en local ou derrière le proxy de production.",
    },
  ],
  tags: [
    {
      name: "Authentification",
      description: "Création de compte, ouverture de session et récupération du profil courant.",
    },
  ],
  paths: {
    "/api/register": {
      post: {
        tags: ["Authentification"],
        operationId: "register",
        summary: "Créer un compte et obtenir un JWT",
        description: `
Crée un compte dans SQLite, hash le mot de passe avec bcrypt, puis renvoie immédiatement un jeton utilisable sur **GET /api/me**.

Le nom d'utilisateur est débarrassé des espaces au début et à la fin avant validation. Il doit ensuite contenir de 3 à 32 caractères ASCII : lettres, chiffres, tiret bas, point ou tiret. Les noms d'utilisateur sont uniques sans distinction de casse.

L'adresse e-mail est obligatoire. Les espaces autour sont supprimés et l'adresse est convertie en minuscules avant enregistrement. Elle doit avoir au plus 254 caractères et ressembler à une adresse de la forme nom@exemple.fr. Une même adresse ne peut être utilisée que pour un seul compte. L'API ne confirme pas que l'utilisateur contrôle cette adresse.

Le mot de passe doit contenir au moins 8 caractères Unicode et au maximum 72 octets une fois encodé en UTF-8. La limite en octets est celle requise par bcrypt; les caractères accentués et emoji peuvent occuper plusieurs octets chacun.
        `.trim(),
        requestBody: {
          required: true,
          description: "Un objet JSON contenant username, email et password. Envoyer avec Content-Type: application/json et un corps UTF-8.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              examples: {
                valide: {
                  summary: "Inscription valide",
                  value: { username: "alice", email: "alice@example.fr", password: "mot-de-passe-123" },
                },
                espacesAutour: {
                  summary: "Les espaces autour du nom sont retirés",
                  value: { username: "  alice  ", email: "  ALICE@EXAMPLE.FR  ", password: "mot-de-passe-123" },
                },
                motDePasseTropCourt: {
                  summary: "Exemple invalide : mot de passe trop court",
                  value: { username: "alice", email: "alice@example.fr", password: "court" },
                },
                nomInvalide: {
                  summary: "Exemple invalide : caractères interdits dans le nom",
                  value: { username: "alice martin", email: "alice@example.fr", password: "mot-de-passe-123" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Compte créé. La réponse contient le profil public et le JWT (expiration après 3600 secondes).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterResponse" },
                example: {
                  user: { username: "alice", email: "alice@example.fr" },
                  token: "<jwt-signé-à-copier-dans-authorize>",
                  token_type: "Bearer",
                  expires_in: 3600,
                },
              },
            },
          },
          400: {
            description: "Corps JSON mal formé ou champ absent/invalide. Les détails de validation sont renvoyés dans details.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                examples: {
                  validation: {
                    summary: "Les champs ne respectent pas les contraintes",
                    value: {
                      error: "invalid_request",
                      message: "La requête contient des champs invalides. Consultez details pour savoir quoi corriger.",
                      details: [
                        { field: "username", code: "invalid_length", message: "Le nom d'utilisateur contient 2 caractères après suppression des espaces; il en faut entre 3 et 32." },
                        { field: "email", code: "invalid_format", message: "L'adresse e-mail doit contenir un nom, le caractère @ et un domaine avec une extension (exemple : nom@exemple.fr)." },
                        { field: "password", code: "too_short", message: "Le mot de passe contient 5 caractères; le minimum est de 8." },
                      ],
                    },
                  },
                  jsonMalForme: {
                    summary: "Le corps ne peut pas être analysé comme JSON",
                    value: {
                      error: "invalid_request",
                      message: "Le corps n'est pas un JSON valide. Vérifiez les guillemets, virgules et accolades.",
                      details: [{ field: "body", code: "invalid_json", message: "Impossible de lire le corps JSON envoyé." }],
                    },
                  },
                },
              },
            },
          },
          409: {
            description: "Le nom d'utilisateur ou l'adresse e-mail est déjà utilisé. Les deux comparaisons sont insensibles à la casse.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                examples: {
                  emailPris: {
                    summary: "Adresse e-mail déjà associée à un compte",
                    value: {
                      error: "email_taken",
                      message: "Cette adresse e-mail est déjà associée à un compte. Utilisez une autre adresse ou connectez-vous.",
                      details: [{ field: "email", code: "already_taken", message: "Les adresses e-mail sont normalisées en minuscules et uniques." }],
                    },
                  },
                  nomPris: {
                    summary: "Nom d'utilisateur déjà associé à un compte",
                    value: {
                      error: "username_taken",
                      message: "Ce nom d'utilisateur est déjà utilisé. Choisissez-en un autre.",
                      details: [{ field: "username", code: "already_taken", message: "Les noms d'utilisateur sont uniques sans distinction de casse." }],
                    },
                  },
                },
              },
            },
          },
          413: {
            description: "Le corps de la requête dépasse la limite JSON de 102400 octets (100 KiB).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "payload_too_large", message: "Le corps de la requête dépasse la limite de 102400 octets. Réduisez sa taille puis réessayez." },
              },
            },
          },
          415: {
            description: "Encodage de contenu ou jeu de caractères non pris en charge.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "unsupported_encoding", message: "L'encodage ou le jeu de caractères de la requête n'est pas pris en charge. Utilisez JSON en UTF-8." },
              },
            },
          },
          500: {
            description: "Erreur interne. Les détails techniques ne sont pas exposés au client.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "internal_server_error", message: "Une erreur interne est survenue. Réessayez plus tard." },
              },
            },
          },
        },
      },
    },
    "/api/login": {
      post: {
        tags: ["Authentification"],
        operationId: "login",
        summary: "Vérifier les identifiants et obtenir un JWT",
        description: `
Cherche l'adresse e-mail dans SQLite, puis compare le mot de passe fourni avec son hash bcrypt. L'adresse est nettoyée des espaces autour et convertie en minuscules avant la recherche. Elle n'est pas sensible à la casse. L'adresse e-mail est le seul identifiant accepté pour se connecter; le champ username est rejeté.

En cas de succès, renvoie un JWT valide pendant 1 heure. Si le compte n'existe pas ou si le mot de passe ne correspond pas, la réponse est toujours 401 avec le code invalid_credentials pour ne pas révéler l'existence d'un compte.
        `.trim(),
        requestBody: {
          required: true,
          description: "Un objet JSON contenant email et password. Le nom d'utilisateur seul ou en plus de l'e-mail n'est pas accepté pour cette route.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
              examples: {
                valide: {
                  summary: "Connexion valide",
                  value: { email: "alice@example.fr", password: "mot-de-passe-123" },
                },
                identifiantsIncorrects: {
                  summary: "Exemple : compte absent ou mot de passe erroné",
                  value: { email: "alice@example.fr", password: "mauvais-mot-de-passe" },
                },
                usernameNonAccepte: {
                  summary: "Exemple invalide : username n'est pas un identifiant de connexion",
                  value: { username: "alice", email: "alice@example.fr", password: "mot-de-passe-123" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Connexion réussie. Le JWT expire après 3600 secondes.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenResponse" },
                example: { token: "<jwt-signé-à-copier-dans-authorize>", token_type: "Bearer", expires_in: 3600 },
              },
            },
          },
          400: {
            description: "Corps JSON mal formé ou champ absent/invalide. Les détails précisent les règles violées.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                examples: {
                  validation: {
                    summary: "Mot de passe dépassant la limite bcrypt",
                    value: {
                      error: "invalid_request",
                      message: "La requête contient des champs invalides. Consultez details pour savoir quoi corriger.",
                      details: [{ field: "password", code: "too_long", message: "Le mot de passe occupe 80 octets UTF-8; le maximum est de 72 octets." }],
                    },
                  },
                  jsonMalForme: {
                    summary: "Le corps ne peut pas être analysé comme JSON",
                    value: {
                      error: "invalid_request",
                      message: "Le corps n'est pas un JSON valide. Vérifiez les guillemets, virgules et accolades.",
                      details: [{ field: "body", code: "invalid_json", message: "Impossible de lire le corps JSON envoyé." }],
                    },
                  },
                  usernameRefuse: {
                    summary: "La connexion par username n'est pas autorisée",
                    value: {
                      error: "invalid_request",
                      message: "La requête contient des champs invalides. Consultez details pour savoir quoi corriger.",
                      details: [{ field: "username", code: "unsupported_field", message: "La connexion par nom d'utilisateur n'est pas acceptée. Utilisez le champ email." }],
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "Adresse e-mail inconnue ou mot de passe incorrect. Cette réponse ne permet pas de distinguer ces cas.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: {
                  error: "invalid_credentials",
                  message: "Adresse e-mail ou mot de passe incorrect. Vérifiez vos identifiants puis réessayez.",
                },
              },
            },
          },
          413: {
            description: "Le corps de la requête dépasse la limite JSON de 102400 octets (100 KiB).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "payload_too_large", message: "Le corps de la requête dépasse la limite de 102400 octets. Réduisez sa taille puis réessayez." },
              },
            },
          },
          415: {
            description: "Encodage de contenu ou jeu de caractères non pris en charge.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "unsupported_encoding", message: "L'encodage ou le jeu de caractères de la requête n'est pas pris en charge. Utilisez JSON en UTF-8." },
              },
            },
          },
          500: {
            description: "Erreur interne. Les détails techniques ne sont pas exposés au client.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "internal_server_error", message: "Une erreur interne est survenue. Réessayez plus tard." },
              },
            },
          },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Authentification"],
        operationId: "getCurrentUser",
        summary: "Récupérer le profil de l'utilisateur connecté",
        description: `
Vérifie la signature du JWT en HS256 et son expiration, puis renvoie le nom d'utilisateur porté par le jeton. Cette route ne lit pas de données de profil supplémentaires en base.

La requête doit contenir un en-tête Authorization utilisant le schéma Bearer et le jeton. Dans Swagger UI, cliquez sur **Authorize** et collez uniquement le jeton.
        `.trim(),
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Le jeton est valide. Le profil contient le nom d'utilisateur et l'e-mail pour les comptes qui en possèdent un; aucun mot de passe ni hash n'est renvoyé. Les comptes historiques peuvent ne pas avoir d'e-mail.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CurrentUserResponse" },
                example: { user: { username: "alice", email: "alice@example.fr" } },
              },
            },
          },
          401: {
            description: "Jeton manquant, en-tête mal formé, jeton invalide/non actif ou jeton expiré. Le champ message indique comment corriger le cas rencontré.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                examples: {
                  absent: {
                    summary: "Aucun en-tête Authorization",
                    value: { error: "unauthorized", message: "Jeton manquant. Envoyez-le dans l'en-tête Authorization: Bearer <token>." },
                  },
                  formatInvalide: {
                    summary: "Le schéma Bearer est absent ou mal formé",
                    value: { error: "unauthorized", message: "En-tête Authorization invalide. Le format attendu est Bearer <token>." },
                  },
                  expire: {
                    summary: "Le JWT a expiré",
                    value: { error: "unauthorized", message: "Le jeton a expiré. Reconnectez-vous pour en obtenir un nouveau." },
                  },
                  signatureInvalide: {
                    summary: "Le JWT est invalide",
                    value: { error: "unauthorized", message: "Le jeton est invalide ou n'est pas encore actif. Vérifiez-le ou reconnectez-vous." },
                  },
                },
              },
            },
          },
          500: {
            description: "Erreur interne. Les détails techniques ne sont pas exposés au client.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: { error: "internal_server_error", message: "Une erreur interne est survenue. Réessayez plus tard." },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["username", "email", "password"],
        properties: {
          username: { $ref: "#/components/schemas/Username" },
          email: { $ref: "#/components/schemas/EmailAddress" },
          password: { $ref: "#/components/schemas/Password" },
        },
      },
      LoginRequest: {
        type: "object",
        description: "Seuls email et password sont acceptés pour la connexion. username ne peut pas être utilisé comme identifiant.",
        required: ["email", "password"],
        not: { required: ["username"] },
        properties: {
          email: { $ref: "#/components/schemas/EmailAddress" },
          password: { $ref: "#/components/schemas/Password" },
        },
      },
      Username: {
        type: "string",
        pattern: "^\\s*[A-Za-z0-9_.-]{3,32}\\s*$",
        description: "Après suppression des espaces au début et à la fin : 3 à 32 caractères ASCII parmi les lettres, chiffres, _, . et -. Aucun espace interne. Unicité insensible à la casse.",
        example: "alice",
      },
      EmailAddress: {
        type: "string",
        pattern: "^\\s*[^\\s@]+@[^\\s@]+\\.[^\\s@]+\\s*$",
        description: "Adresse de la forme nom@exemple.fr. Maximum 254 caractères après suppression des espaces autour et conversion en minuscules. Unicité sans distinction de casse. L'API ne vérifie pas la possession de l'adresse.",
        example: "alice@example.fr",
      },
      Password: {
        type: "string",
        minLength: 8,
        description: "Minimum 8 caractères Unicode et maximum 72 octets UTF-8. La limite supérieure est en octets, pas en caractères, pour respecter bcrypt.",
        example: "mot-de-passe-123",
      },
      TokenResponse: {
        type: "object",
        required: ["token", "token_type", "expires_in"],
        properties: {
          token: { type: "string", description: "JWT signé en HS256. Utilisez-le comme jeton Bearer.", example: "<jwt>" },
          token_type: { type: "string", enum: ["Bearer"], description: "Type d'authentification à utiliser dans l'en-tête HTTP." },
          expires_in: { type: "integer", format: "int32", enum: [3600], description: "Durée de validité du jeton en secondes (1 heure).", example: 3600 },
        },
      },
      RegisterResponse: {
        type: "object",
        required: ["user", "token", "token_type", "expires_in"],
        properties: {
          user: { $ref: "#/components/schemas/RegisteredUser" },
          token: { type: "string", description: "JWT signé en HS256. Utilisez-le comme jeton Bearer.", example: "<jwt>" },
          token_type: { type: "string", enum: ["Bearer"] },
          expires_in: { type: "integer", format: "int32", enum: [3600], description: "Durée de validité du jeton en secondes.", example: 3600 },
        },
      },
      CurrentUserResponse: {
        type: "object",
        required: ["user"],
        properties: { user: { $ref: "#/components/schemas/PublicUser" } },
      },
      PublicUser: {
        type: "object",
        required: ["username"],
        description: "L'e-mail est absent pour les comptes historiques créés avant l'ajout de cette donnée.",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 32, description: "Nom d'utilisateur normalisé renvoyé par l'API.", example: "alice" },
          email: { $ref: "#/components/schemas/EmailAddress" },
        },
      },
      RegisteredUser: {
        type: "object",
        required: ["username", "email"],
        properties: {
          username: { $ref: "#/components/schemas/Username" },
          email: { $ref: "#/components/schemas/EmailAddress" },
        },
      },
      ApiError: {
        type: "object",
        required: ["error", "message"],
        properties: {
          error: { type: "string", description: "Code stable destiné au traitement programmatique par le client.", example: "invalid_request" },
          message: { type: "string", description: "Explication lisible de l'erreur; peut varier selon la cause précise.", example: "La requête contient des champs invalides." },
          details: {
            type: "array",
            description: "Présent pour les erreurs de validation; une entrée par champ ou erreur de corps à corriger.",
            items: {
              type: "object",
              required: ["field", "code", "message"],
              properties: {
                field: { type: "string", description: "Nom du champ invalide ou body pour une erreur de JSON.", example: "password" },
                code: { type: "string", description: "Code de validation stable pour ce champ.", enum: ["required", "invalid_type", "invalid_length", "invalid_characters", "invalid_format", "unsupported_field", "too_short", "too_long", "already_taken", "invalid_json"], example: "too_short" },
                message: { type: "string", description: "Mesure reçue et contrainte attendue lorsque cela s'applique.", example: "Le mot de passe contient 5 caractères; le minimum est de 8." },
              },
            },
          },
        },
      },
    },
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Dans la fenêtre Authorize, collez uniquement le JWT obtenu avec register ou login. Swagger ajoute le préfixe Bearer automatiquement.",
      },
    },
  },
};

module.exports = openApiDocument;
