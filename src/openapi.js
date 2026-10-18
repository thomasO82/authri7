const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Authri7 API",
    version: "1.0.0",
    description: "API pédagogique d'inscription, de connexion et de validation d'un jeton Bearer.",
  },
  servers: [
    {
      url: "/",
      description: "Même origine que l'interface Swagger (compatible avec la production).",
    },
  ],
  tags: [{ name: "Authentification" }],
  paths: {
    "/api/register": {
      post: {
        tags: ["Authentification"],
        summary: "Créer un compte et obtenir un JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: {
                    type: "string",
                    minLength: 3,
                    maxLength: 32,
                    pattern: "^[A-Za-z0-9_.-]+$",
                    description: "Les espaces en début et fin sont retirés. L'unicité ne tient pas compte de la casse.",
                    example: "alice",
                  },
                  password: {
                    type: "string",
                    minLength: 8,
                    description: "Au moins 8 caractères, maximum 72 octets UTF-8.",
                    example: "mot-de-passe-123",
                  },
                },
              },
              example: { username: "alice", password: "mot-de-passe-123" },
            },
          },
        },
        responses: {
          201: {
            description: "Compte créé. Le jeton expire après une heure.",
            content: {
              "application/json": {
                example: {
                  user: { username: "alice" },
                  token: "eyJ...",
                  token_type: "Bearer",
                  expires_in: 3600,
                },
              },
            },
          },
          400: {
            description: "Nom d'utilisateur ou mot de passe invalide.",
            content: {
              "application/json": {
                example: { error: "invalid_request" },
              },
            },
          },
          409: {
            description: "Ce nom d'utilisateur est déjà utilisé.",
            content: {
              "application/json": {
                example: { error: "username_taken" },
              },
            },
          },
          413: { description: "Le corps de la requête est trop volumineux." },
          415: { description: "Encodage ou jeu de caractères non pris en charge." },
        },
      },
    },
    "/api/login": {
      post: {
        tags: ["Authentification"],
        summary: "Se connecter et obtenir un JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["username", "password"],
                properties: {
                  username: { type: "string", example: "alice" },
                  password: {
                    type: "string",
                    description: "Maximum 72 octets UTF-8.",
                    example: "mot-de-passe-123",
                  },
                },
              },
              example: { username: "alice", password: "mot-de-passe-123" },
            },
          },
        },
        responses: {
          200: {
            description: "Connexion réussie. Le jeton expire après une heure.",
            content: {
              "application/json": {
                example: {
                  token: "eyJ...",
                  token_type: "Bearer",
                  expires_in: 3600,
                },
              },
            },
          },
          400: {
            description: "Corps JSON invalide.",
            content: {
              "application/json": {
                example: { error: "invalid_request" },
              },
            },
          },
          401: {
            description: "Nom d'utilisateur ou mot de passe incorrect.",
            content: {
              "application/json": {
                example: { error: "invalid_credentials" },
              },
            },
          },
          413: { description: "Le corps de la requête est trop volumineux." },
          415: { description: "Encodage ou jeu de caractères non pris en charge." },
        },
      },
    },
    "/api/me": {
      get: {
        tags: ["Authentification"],
        summary: "Récupérer l'utilisateur connecté",
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "Jeton valide.",
            content: {
              "application/json": {
                example: { user: { username: "alice" } },
              },
            },
          },
          401: {
            description: "Jeton absent, invalide ou expiré.",
            content: {
              "application/json": {
                example: { error: "unauthorized" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Collez le JWT obtenu avec POST /api/register ou POST /api/login, sans ajouter le préfixe Bearer.",
      },
    },
  },
};

module.exports = openApiDocument;
