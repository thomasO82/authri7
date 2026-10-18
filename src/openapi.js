const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Authri7 API",
    version: "1.0.0",
    description: "API pédagogique de connexion et de validation d'un jeton Bearer.",
  },
  servers: [
    {
      url: "/",
      description: "Même origine que l'interface Swagger (compatible avec la production).",
    },
  ],
  tags: [{ name: "Authentification" }],
  paths: {
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
                  username: { type: "string", example: "admin" },
                  password: { type: "string", example: "password" },
                },
              },
              example: { username: "admin", password: "password" },
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
            description: "Identifiants incorrects.",
            content: {
              "application/json": {
                example: { error: "invalid_credentials" },
              },
            },
          },
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
                example: { user: { username: "admin" } },
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
        description: "Collez le JWT obtenu avec POST /api/login, sans ajouter le préfixe Bearer.",
      },
    },
  },
};

module.exports = openApiDocument;
