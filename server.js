// ================= IMPORTS =================
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require('dotenv').config();

// ================= APP =================
const app = express();
app.use(cors());
app.use(express.json());

// ================= CONNEXION MYSQL =================
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "database"
});

db.connect((err) => {
    if (err) {
        console.error("❌ Erreur de connexion MySQL :", err);
        return;
    }
    console.log("✅ Connecté à MySQL - Base de données:", process.env.DB_NAME || "covoiturage");
});

// ================= TOKENS =================
const tokens = {}; // token => user_id

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
app.post("/api/auth/register", (req, res) => {
    const { nom, prenom, email, telephone, residence, password } = req.body;

    console.log("📝 Tentative d'inscription:", { nom, prenom, email, telephone, residence });

    // Vérification des champs obligatoires
    if (!nom || !prenom || !email || !password) {
        return res.status(400).json({ 
            message: "Champs obligatoires manquants (nom, prénom, email, password)" 
        });
    }

    // Vérifier si l'email existe déjà
    db.query(
        "SELECT id FROM users WHERE email = ?",
        [email],
        (err, results) => {
            if (err) {
                console.error("❌ Erreur vérification email:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: "Cet email est déjà utilisé" });
            }

            // Insérer le nouvel utilisateur
            db.query(
                `INSERT INTO users (nom, prenom, email, telephone, residence, password) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [nom, prenom, email, telephone || null, residence || null, password],
                (err, result) => {
                    if (err) {
                        console.error("❌ Erreur insertion utilisateur:", err);
                        return res.status(500).json({ message: "Erreur lors de l'inscription" });
                    }

                    console.log("✅ Utilisateur créé avec ID:", result.insertId);
                    
                    res.status(201).json({ 
                        success: true,
                        message: "Compte créé avec succès",
                        userId: result.insertId 
                    });
                }
            );
        }
    );
});

// ================= LOGIN =================
app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    console.log("🔑 Tentative de connexion:", email);

    if (!email || !password) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    db.query(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        [email, password],
        (err, results) => {
            if (err) {
                console.error("❌ Erreur login:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            if (results.length === 0) {
                console.log("❌ Identifiants invalides pour:", email);
                return res.status(401).json({ message: "Email ou mot de passe incorrect" });
            }

            const user = results[0];
            const token = "TOKEN_" + Date.now() + "_" + Math.random().toString(36).substring(2);
            tokens[token] = user.id;

            console.log("✅ Connexion réussie pour:", user.email);

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

// ================= CRÉER UN TRAJET =================
app.post("/api/client/trajets", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places } = req.body;
  console.log("Création trajet - User:", req.user.id, "Données reçues:", req.body);

  if (!destination || !places || !date_depart || !heure_depart) {
    console.log("Champs manquants:", { destination, places, date_depart, heure_depart });
    return res.status(400).json({ message: "Champs manquants" });
  }

  const heure = `${date_depart} ${heure_depart}`;

  db.query(
    "INSERT INTO trajets (user_id, depart, destination, heure, places) VALUES (?, ?, ?, ?, ?)",
    [req.user.id, depart || "Position actuelle", destination, heure, places],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur création trajet:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      console.log("✅ Trajet créé avec ID:", result.insertId);

      res.json({
        id: result.insertId,
        depart: depart || "Position actuelle",
        destination: destination, // corrigé
        heure,
        places
      });
    }
  );
});
// ================= MES TRAJETS =================
app.get("/api/client/mes-trajets", authenticate, (req, res) => {
    const userId = req.user.id;

    console.log("🔍 Chargement trajets pour user_id =", userId);

    db.query(
        "SELECT * FROM trajets WHERE user_id = ? ORDER BY heure DESC",
        [userId],
        (err, results) => {
            if (err) {
                console.error("❌ Erreur chargement trajets:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            console.log("📥 Trajets trouvés:", results.length);
            res.json(results);
        }
    );
});

// ================= SUPPRIMER UN TRAJET =================
app.delete("/api/client/trajets/:id", authenticate, (req, res) => {
    const trajetId = req.params.id;
    const userId = req.user.id;

    console.log("🗑️ Suppression trajet", trajetId, "pour user", userId);

    db.query(
        "DELETE FROM trajets WHERE id = ? AND user_id = ?",
        [trajetId, userId],
        (err, result) => {
            if (err) {
                console.error("❌ Erreur suppression:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Trajet non trouvé ou non autorisé" });
            }

            console.log("✅ Trajet supprimé");
            res.json({ message: "Trajet supprimé avec succès" });
        }
    );
});

// ================= MODIFIER UN TRAJET =================
app.put("/api/client/trajets/:id", authenticate, (req, res) => {
    const trajetId = req.params.id;
    const userId = req.user.id;
    const { depart, destination, heure, places } = req.body;

    console.log("✏️ Modification trajet", trajetId, "pour user", userId);

    if (!destination || !heure || !places) {
        return res.status(400).json({ message: "Champs manquants" });
    }

    db.query(
        "UPDATE trajets SET depart = ?, destination = ?, heure = ?, places = ? WHERE id = ? AND user_id = ?",
        [depart || "Position actuelle", destination, heure, places, trajetId, userId],
        (err, result) => {
            if (err) {
                console.error("❌ Erreur modification:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Trajet non trouvé" });
            }

            console.log("✅ Trajet modifié");
            res.json({ message: "Trajet modifié avec succès" });
        }
    );
});

// ================= AJOUTER/SUPPRIMER FAVORI =================
app.post("/api/client/favoris/:trajetId", authenticate, (req, res) => {
    const userId = req.user.id;
    const trajetId = req.params.trajetId;

    console.log("❤️ Toggle favori - User:", userId, "Trajet:", trajetId);

    // Vérifier si le favori existe déjà
    db.query(
        "SELECT * FROM favoris WHERE user_id = ? AND trajet_id = ?",
        [userId, trajetId],
        (err, results) => {
            if (err) {
                console.error("❌ Erreur vérification favori:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            if (results.length > 0) {
                // Supprimer le favori
                db.query(
                    "DELETE FROM favoris WHERE id = ?",
                    [results[0].id],
                    (err) => {
                        if (err) {
                            console.error("❌ Erreur suppression favori:", err);
                            return res.status(500).json({ message: "Erreur serveur" });
                        }
                        console.log("✅ Favori supprimé");
                        res.json({ favori: false });
                    }
                );
            } else {
                // Ajouter le favori
                db.query(
                    "INSERT INTO favoris (user_id, trajet_id) VALUES (?, ?)",
                    [userId, trajetId],
                    (err) => {
                        if (err) {
                            console.error("❌ Erreur ajout favori:", err);
                            return res.status(500).json({ message: "Erreur serveur" });
                        }
                        console.log("✅ Favori ajouté");
                        res.json({ favori: true });
                    }
                );
            }
        }
    );
});

// ================= RÉCUPÉRER LES FAVORIS =================
app.get("/api/client/favoris", authenticate, (req, res) => {
    const userId = req.user.id;

    console.log("⭐ Chargement favoris pour user:", userId);

    db.query(
        `SELECT t.* 
         FROM trajets t
         INNER JOIN favoris f ON f.trajet_id = t.id
         WHERE f.user_id = ?
         ORDER BY f.created_at DESC`,
        [userId],
        (err, results) => {
            if (err) {
                console.error("❌ Erreur chargement favoris:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            console.log("📥 Favoris trouvés:", results.length);
            res.json(results);
        }
    );
});

// ================= TEST CONNEXION =================
app.get("/api/test", (req, res) => {
    db.query("SELECT 1 + 1 AS solution", (err, results) => {
        if (err) {
            res.json({ status: "MySQL ❌", error: err.message });
        } else {
            res.json({ 
                status: "MySQL ✅", 
                solution: results[0].solution,
                database: process.env.DB_NAME || "covoiturage"
            });
        }
    });
});

// ================= MOT DE PASSE OUBLIÉ =================
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // Pour l'envoi d'email (optionnel)

// Configuration du transporteur email (à configurer avec vos vrais identifiants)
const transporter = nodemailer.createTransport({
  service: 'gmail', // ou autre
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. Demande de réinitialisation
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email requis" });
  }

  // Vérifier si l'utilisateur existe
  db.query("SELECT id FROM users WHERE email = ?", [email], (err, results) => {
    if (err) {
      console.error("❌ Erreur vérification email:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    // Même si l'utilisateur n'existe pas, on répond un message générique (sécurité)
    // pour éviter de révéler quels emails sont enregistrés.
    if (results.length === 0) {
      console.log("📧 Email inconnu:", email);
      return res.json({ message: "Si cet email existe, vous recevrez un lien de réinitialisation." });
    }

    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    // Supprimer les anciens tokens pour cet email
    db.query("DELETE FROM password_resets WHERE email = ?", [email], (err) => {
      if (err) console.error("❌ Erreur suppression anciens tokens:", err);

      // Insérer le nouveau token
      db.query(
        "INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)",
        [email, token, expiresAt],
        (err) => {
          if (err) {
            console.error("❌ Erreur insertion token:", err);
            return res.status(500).json({ message: "Erreur serveur" });
          }

          // Construire le lien de réinitialisation (à adapter avec votre domaine)
          const resetLink = `https://votre-app.com/reset-password?token=${token}`;

          // Envoyer l'email (optionnel - vous pouvez commencer sans)
          // Si vous n'avez pas configuré l'email, loggez simplement le lien
          console.log("🔗 Lien de réinitialisation (à envoyer par email):", resetLink);

          // Si vous voulez vraiment envoyer un email :
          /*
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Réinitialisation de votre mot de passe",
            html: `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe :</p>
                   <a href="${resetLink}">${resetLink}</a>
                   <p>Ce lien expire dans 1 heure.</p>`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("❌ Erreur envoi email:", error);
            } else {
              console.log("✅ Email envoyé:", info.response);
            }
          });
          */

          res.json({ message: "Si cet email existe, vous recevrez un lien de réinitialisation." });
        }
      );
    });
  });
});

// 2. Réinitialisation du mot de passe (après clic sur le lien)
app.post("/api/auth/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Token et nouveau mot de passe requis" });
  }

  // Vérifier le token
  db.query(
    "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
    [token],
    (err, results) => {
      if (err) {
        console.error("❌ Erreur vérification token:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: "Token invalide ou expiré" });
      }

      const { email } = results[0];

      // Mettre à jour le mot de passe de l'utilisateur
      db.query(
        "UPDATE users SET password = ? WHERE email = ?",
        [newPassword, email],
        (err) => {
          if (err) {
            console.error("❌ Erreur mise à jour mot de passe:", err);
            return res.status(500).json({ message: "Erreur serveur" });
          }

          // Supprimer le token utilisé
          db.query("DELETE FROM password_resets WHERE token = ?", [token]);

          res.json({ message: "Mot de passe mis à jour avec succès" });
        }
      );
    }
  );
});
// ================= DÉCONNEXION =================
app.post("/api/auth/logout", authenticate, (req, res) => {
    const auth = req.headers.authorization;
    const token = auth.replace("Bearer ", "");
    
    if (tokens[token]) {
        delete tokens[token];
        console.log("👋 Utilisateur déconnecté");
    }
    
    res.json({ message: "Déconnexion réussie" });
});
// ================= BUS LIVE (TEST) =================
app.get("/api/bus/live", (req, res) => {
  res.json({
    status: "OK",
    message: "Route bus live fonctionnelle",
    buses: []
  });
});
// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});