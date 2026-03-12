// ================= IMPORTS =================
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// ================= APP =================
const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// ================= RATE LIMIT =================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Trop de requêtes, réessayez plus tard."
});

app.use(limiter);

// ================= TOKENS =================
const tokens = {};

// ================= CONNEXION MYSQL =================
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// ================= AUTH MIDDLEWARE =================
function authenticate(req, res, next) {

  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const token = auth.replace("Bearer ", "");
  const userId = tokens[token];

  if (!userId) {
    return res.status(401).json({ message: "Token invalide" });
  }

  req.user = { id: userId };
  next();
}

// ================= REGISTER =================
app.post("/api/auth/register", async (req, res) => {

  const { nom, prenom, email, telephone, residence, password } = req.body;

  if (!nom || !prenom || !email || !password) {
    return res.status(400).json({
      message: "Champs obligatoires manquants"
    });
  }

  try {

    db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
      async (err, results) => {

        if (err) {
          return res.status(500).json({ message: "Erreur serveur" });
        }

        if (results.length > 0) {
          return res.status(400).json({ message: "Email déjà utilisé" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
          "INSERT INTO users (nom, prenom, email, telephone, residence, password) VALUES (?, ?, ?, ?, ?, ?)",
          [nom, prenom, email, telephone || null, residence || null, hashedPassword],
          (err, result) => {

            if (err) {
              return res.status(500).json({ message: "Erreur inscription" });
            }

            res.status(201).json({
              message: "Compte créé avec succès",
              userId: result.insertId
            });

          }
        );

      }
    );

  } catch (error) {

    res.status(500).json({ message: "Erreur serveur" });

  }

});

// ================= LOGIN =================
app.post("/api/auth/login", (req, res) => {

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email et mot de passe requis"
    });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {

      if (err) {
        return res.status(500).json({ message: "Erreur serveur" });
      }

      if (results.length === 0) {
        return res.status(401).json({
          message: "Email ou mot de passe incorrect"
        });
      }

      const user = results[0];

      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        return res.status(401).json({
          message: "Email ou mot de passe incorrect"
        });
      }

      const token =
        "TOKEN_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2);

      tokens[token] = user.id;

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          telephone: user.telephone,
          residence: user.residence
        }
      });

    }
  );

});

// ================= TEST =================
app.get("/api/test", (req, res) => {

  db.query("SELECT 1+1 AS result", (err, results) => {

    if (err) {
      return res.json({
        status: "MySQL ❌",
        error: err.message
      });
    }

    res.json({
      status: "MySQL ✅",
      solution: results[0].result,
      database: process.env.DB_NAME
    });

  });

});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Serveur démarré sur le port " + PORT);
});