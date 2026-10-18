require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET est obligatoire. Configurez-le dans votre environnement ou fichier .env.");
}

const app = require("./app");
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur d'authentification disponible sur http://localhost:${PORT}`);
});
