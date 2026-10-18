const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Authri7 — API d'authentification",
    version: "1.0.0",
    description: `
Créez votre compte avec une adresse e-mail, connectez-vous avec celle-ci et consultez votre profil.

### Créer un compte

Dans **POST /api/register**, renseignez votre adresse e-mail et choisissez un mot de passe.

- L'adresse e-mail sert à vous connecter. Les majuscules et les espaces autour sont automatiquement normalisés.
- Aucun e-mail de confirmation n'est envoyé après l'inscription.
- Le mot de passe doit contenir au moins 8 caractères et ne pas dépasser la limite de 72 octets UTF-8.

### Se connecter

Dans **POST /api/login**, utilisez votre adresse e-mail et votre mot de passe.

### Voir votre profil

Après l'inscription ou la connexion, copiez le jeton reçu. Cliquez sur **Authorize**, collez le jeton, puis essayez **GET /api/me** pour afficher votre profil.

Le jeton reste valide pendant une heure. Quand il expire, connectez-vous à nouveau pour en obtenir un autre. Les exemples de requêtes et de réponses sont disponibles dans chaque opération ci-dessous.
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
Crée un compte avec l'adresse e-mail et le mot de passe fournis, puis renvoie immédiatement un jeton utilisable sur **GET /api/me**.

L'adresse e-mail est obligatoire. Les espaces autour sont supprimés et l'adresse est convertie en minuscules avant enregistrement. Elle doit avoir au plus 254 caractères et ressembler à une adresse de la forme nom@exemple.fr. Une même adresse ne peut être utilisée que pour un seul compte. L'API ne confirme pas que l'utilisateur contrôle cette adresse.

Le mot de passe doit contenir au moins 8 caractères Unicode et au maximum 72 octets une fois encodé en UTF-8. La limite en octets est celle requise par bcrypt; les caractères accentués et emoji peuvent occuper plusieurs octets chacun.
        `.trim(),
        requestBody: {
          required: true,
          description: "Un objet JSON contenant email et password. Envoyer avec Content-Type: application/json et un corps UTF-8.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
              examples: {
                valide: {
                  summary: "Inscription valide",
                  value: { email: "alice@example.fr", password: "mot-de-passe-123" },
                },
                espacesAutour: {
                  summary: "Les espaces autour de l'e-mail sont retirés et les majuscules normalisées",
                  value: { email: "  ALICE@EXAMPLE.FR  ", password: "mot-de-passe-123" },
                },
                motDePasseTropCourt: {
                  summary: "Exemple invalide : mot de passe trop court",
                  value: { email: "alice@example.fr", password: "court" },
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
                  user: { email: "alice@example.fr" },
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
            description: "L'adresse e-mail est déjà associée à un compte.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
                example: {
                  error: "email_taken",
                  message: "Cette adresse e-mail est déjà associée à un compte. Utilisez une autre adresse ou connectez-vous.",
                  details: [{ field: "email", code: "already_taken", message: "Les adresses e-mail sont normalisées en minuscules et uniques." }],
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
Cherche l'adresse e-mail dans SQLite, puis vérifie le mot de passe. Les majuscules et espaces autour de l'adresse sont normalisés automatiquement.

En cas de succès, renvoie un JWT valide pendant 1 heure. Si le compte n'existe pas ou si le mot de passe ne correspond pas, la réponse est toujours 401 avec le code invalid_credentials pour ne pas révéler l'existence d'un compte.
        `.trim(),
        requestBody: {
          required: true,
          description: "Un objet JSON contenant email et password.",
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
Vérifie le jeton et sa date d'expiration, puis renvoie l'adresse e-mail du compte.

La requête doit contenir un en-tête Authorization utilisant le schéma Bearer et le jeton. Dans Swagger UI, cliquez sur **Authorize** et collez uniquement le jeton.
        `.trim(),
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Le jeton est valide. Le profil contient l'adresse e-mail du compte. Aucun mot de passe ni hash n'est renvoyé.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CurrentUserResponse" },
                example: { user: { email: "alice@example.fr" } },
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
        required: ["email", "password"],
        not: { required: ["username"] },
        properties: {
          email: { $ref: "#/components/schemas/EmailAddress" },
          password: { $ref: "#/components/schemas/Password" },
        },
      },
      LoginRequest: {
        type: "object",
        description: "L'adresse e-mail est le seul identifiant de compte.",
        required: ["email", "password"],
        not: { required: ["username"] },
        properties: {
          email: { $ref: "#/components/schemas/EmailAddress" },
          password: { $ref: "#/components/schemas/Password" },
        },
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
          user: { $ref: "#/components/schemas/PublicUser" },
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
        required: ["email"],
        properties: {
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
                code: { type: "string", description: "Code de validation stable pour ce champ.", enum: ["required", "invalid_type", "invalid_format", "unsupported_field", "too_short", "too_long", "already_taken", "invalid_json"], example: "too_short" },
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
