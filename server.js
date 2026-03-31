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

// ================= TOKENS (client - inchangé) =================
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
  ssl: { rejectUnauthorized: false }
});

// ================= AUTH MIDDLEWARE CLIENT (inchangé) =================
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token manquant" });

  const token = auth.replace("Bearer ", "");
  const userId = tokens[token];
  if (!userId) return res.status(401).json({ message: "Token invalide" });

  req.user = { id: userId };
  next();
}

// ================= AUTH MIDDLEWARE CHAUFFEUR (JWT) =================
function authenticateDriver(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token manquant" });

  const token = auth.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.driver = { id: decoded.id, email: decoded.email, driverId: decoded.driverId };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
}

// =======================================================
// ============= ROUTES CLIENT (inchangées) ==============
// =======================================================

app.post("/api/auth/register", async (req, res) => {
  const { nom, prenom, email, telephone, residence, password } = req.body;
  if (!nom || !prenom || !email || !password)
    return res.status(400).json({ message: "Champs obligatoires manquants" });

  try {
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (results.length > 0) return res.status(400).json({ message: "Email déjà utilisé" });

      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        "INSERT INTO users (nom, prenom, email, telephone, residence, password) VALUES (?, ?, ?, ?, ?, ?)",
        [nom, prenom, email, telephone || null, residence || null, hashedPassword],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Erreur inscription" });
          res.status(201).json({ message: "Compte créé avec succès", userId: result.insertId });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (results.length === 0) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

    const token = "TOKEN_" + Date.now() + "_" + Math.random().toString(36).substring(2);
    tokens[token] = user.id;

    res.json({
      token,
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, telephone: user.telephone, residence: user.residence }
    });
  });
});

app.post("/api/client/trajets", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places } = req.body;
  if (!destination || !places || !date_depart || !heure_depart)
    return res.status(400).json({ message: "Champs manquants" });

  const heure = `${date_depart} ${heure_depart}`;
  db.query(
    "INSERT INTO trajets (user_id, depart, destination, heure, places) VALUES (?, ?, ?, ?, ?)",
    [req.user.id, depart || "Position actuelle", destination, heure, places],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json({ id: result.insertId, depart: depart || "Position actuelle", destination, heure, places });
    }
  );
});

app.post("/api/client/demandes", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places } = req.body;
  if (!depart || !destination || !date_depart || !heure_depart || !places)
    return res.status(400).json({ message: "Champs manquants" });

  db.query(
    "INSERT INTO demandes (user_id, depart, destination, date_depart, heure_depart, places) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, depart, destination, date_depart, heure_depart, places],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.status(201).json({ message: "Demande enregistrée avec succès", id: result.insertId });
    }
  );
});

app.get("/api/client/mes-demandes", authenticate, (req, res) => {
  db.query(
    "SELECT * FROM demandes WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(results);
    }
  );
});

app.put("/api/client/demandes/:id", authenticate, (req, res) => {
  const demandeId = req.params.id;
  const { depart, destination, date_depart, heure_depart, places } = req.body;
  if (!depart || !destination || !date_depart || !heure_depart || !places)
    return res.status(400).json({ message: "Champs manquants" });

  db.query(
    "UPDATE demandes SET depart=?, destination=?, date_depart=?, heure_depart=?, places=? WHERE id=? AND user_id=?",
    [depart, destination, date_depart, heure_depart, places, demandeId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Demande non trouvée ou non autorisée" });
      res.json({ message: "Demande modifiée avec succès" });
    }
  );
});

app.delete("/api/client/demandes/:id", authenticate, (req, res) => {
  const demandeId = req.params.id;
  db.query(
    "DELETE FROM demandes WHERE id = ? AND user_id = ?",
    [demandeId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Demande non trouvée" });
      res.json({ message: "Demande supprimée" });
    }
  );
});

// =======================================================
// ============= ROUTES CHAUFFEUR (nouvelles) ============
// =======================================================

// ── Register chauffeur (user + driver en une seule requête) ──
app.post("/api/driver/register", async (req, res) => {
  const { nom, prenom, email, telephone, residence, password,
          vehicle_type, license_number, vehicle_plate, seats } = req.body;

  if (!nom || !prenom || !email || !password)
    return res.status(400).json({ message: "Champs obligatoires manquants" });

  try {
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (results.length > 0) return res.status(400).json({ message: "Email déjà utilisé" });

      const hashedPassword = await bcrypt.hash(password, 10);
      db.query(
        "INSERT INTO users (nom, prenom, email, telephone, residence, password, role) VALUES (?, ?, ?, ?, ?, ?, 'driver')",
        [nom, prenom, email, telephone || null, residence || null, hashedPassword],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Erreur inscription" });

          const userId = result.insertId;
          db.query(
            "INSERT INTO drivers (user_id, vehicle_type, license_number, vehicle_plate, seats, is_online) VALUES (?, ?, ?, ?, ?, false)",
            [userId, vehicle_type || null, license_number || null, vehicle_plate || null, seats || null],
            (err2, result2) => {
              if (err2) return res.status(500).json({ message: "Erreur création chauffeur" });
              res.status(201).json({ message: "Compte chauffeur créé avec succès", userId, driverId: result2.insertId });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ── Login chauffeur (retourne JWT) ──
app.post("/api/driver/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email et mot de passe requis" });

  db.query(
    `SELECT u.*, d.id as driver_id, d.vehicle_type, d.license_number, d.vehicle_plate, d.seats
     FROM users u JOIN drivers d ON d.user_id = u.id WHERE u.email = ?`,
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (results.length === 0) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: "Email ou mot de passe incorrect" });

      const token = jwt.sign(
        { id: user.id, email: user.email, driverId: user.driver_id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          telephone: user.telephone,
          driverId: user.driver_id,
          vehicle_type: user.vehicle_type,
          vehicle_plate: user.vehicle_plate,
          seats: user.seats
        }
      });
    }
  );
});

// ── Profil chauffeur ──
app.get("/api/driver/profile", authenticateDriver, (req, res) => {
  const { driver_id } = req.query;
  if (!driver_id) return res.status(400).json({ message: "driver_id requis" });

  db.query(
    `SELECT d.*, u.nom, u.prenom, u.email, u.telephone, u.residence
     FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = ?`,
    [driver_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (results.length === 0) return res.status(404).json({ message: "Chauffeur introuvable" });
      res.json(results[0]);
    }
  );
});

// ── Trajets du chauffeur ──
app.get("/api/driver/my_trips", authenticateDriver, (req, res) => {
  const { driver_id } = req.query;
  if (!driver_id) return res.status(400).json({ message: "driver_id requis" });

  db.query(
    "SELECT * FROM trajets WHERE user_id = (SELECT user_id FROM drivers WHERE id = ?) ORDER BY heure DESC",
    [driver_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(results);
    }
  );
});

// ── Créer un trajet (chauffeur) ──
app.post("/api/trips/create", authenticateDriver, (req, res) => {
  const { driverId, departure, destination, date, time, seats, price } = req.body;
  if (!driverId || !departure || !destination || !date || !time || !seats)
    return res.status(400).json({ message: "Tous les champs sont requis" });

  db.query(
    "INSERT INTO trajets (user_id, depart, destination, heure, places) VALUES ((SELECT user_id FROM drivers WHERE id = ?), ?, ?, ?, ?)",
    [driverId, departure, destination, `${date} ${time}`, seats],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur création trajet" });
      res.status(201).json({ message: "Trajet créé", tripId: result.insertId });
    }
  );
});

// ── Demandes passagers visibles par le chauffeur ──
app.get("/api/trips/driver_requests", authenticateDriver, (req, res) => {

  db.query(
    `SELECT 
      dm.id,
      dm.depart,
      dm.destination,
      dm.places,
      dm.status,
      u.nom,
      u.prenom,
      u.telephone
     FROM demandes dm
     JOIN users u ON dm.user_id = u.id
     ORDER BY dm.created_at DESC`,
    (err, results) => {

      if (err) return res.status(500).json({ message: "Erreur serveur" });

      res.json(results);

    }
  );

});

// ── Stats chauffeur ──
app.get("/api/driver/stats", authenticateDriver, (req, res) => {
  const { driver_id } = req.query;
  if (!driver_id) return res.status(400).json({ message: "driver_id requis" });

  db.query(
    "SELECT COUNT(*) AS total_trips FROM trajets WHERE user_id = (SELECT user_id FROM drivers WHERE id = ?)",
    [driver_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(results[0]);
    }
  );
});

// ── Historique chauffeur ──
app.get("/api/driver/history", authenticateDriver, (req, res) => {
  const { driver_id } = req.query;
  if (!driver_id) return res.status(400).json({ message: "driver_id requis" });

  db.query(
    "SELECT * FROM trajets WHERE user_id = (SELECT user_id FROM drivers WHERE id = ?) ORDER BY heure DESC",
    [driver_id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(results);
    }
  );
});

// ── Mise à jour position chauffeur ──
app.post("/api/driver/update_location", authenticateDriver, (req, res) => {
  const { driver_id, lat, lng } = req.body;
  if (!driver_id || lat === undefined || lng === undefined)
    return res.status(400).json({ message: "driver_id, lat et lng requis" });

  db.query(
    "UPDATE drivers SET is_online = true WHERE id = ?",
    [driver_id],
    (err) => {
      if (err) return res.status(500).json({ message: "Erreur mise à jour position" });
      res.json({ message: "Position mise à jour" });
    }
  );
});


// ── Accepter / Refuser réservation ──
app.post("/api/trips/reservation_action", authenticateDriver, (req, res) => {

  const { reservation_id, status } = req.body;

  if (!reservation_id || !status) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  db.query(
    "UPDATE demandes SET status = ? WHERE id = ?",
    [status, reservation_id],
    (err, result) => {

      if (err) {
        return res.status(500).json({ message: "Erreur serveur" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Réservation introuvable" });
      }

      res.json({
        success: true,
        message: status === "accepted"
          ? "Réservation acceptée"
          : "Réservation refusée"
      });

    }
  );

});

// =======================================================
// ================= TEST ================================
// =======================================================
app.get("/api/test", (req, res) => {
  db.query("SELECT 1+1 AS result", (err, results) => {
    if (err) return res.json({ status: "MySQL ❌", error: err.message });
    res.json({ status: "MySQL ✅", solution: results[0].result, database: process.env.DB_NAME });
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Serveur démarré sur le port " + PORT);
});
