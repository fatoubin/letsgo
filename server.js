// ================= IMPORTS =================
require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
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
  max: 500,
  message: "Trop de requêtes, réessayez plus tard."
});

app.use(limiter);

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

// ================= NETTOYAGE DES TOKENS EXPIRÉS (toutes les heures) =================
setInterval(() => {
  db.query("DELETE FROM tokens WHERE expires_at < NOW()", (err) => {
    if (err) console.error("❌ Erreur nettoyage tokens:", err);
  });
}, 60 * 60 * 1000);

// ================= AUTH MIDDLEWARE CLIENT (avec base de données) =================
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Token manquant" });

  const token = auth.replace("Bearer ", "");
  db.query(
    "SELECT user_id FROM tokens WHERE token = ? AND expires_at > NOW()",
    [token],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(401).json({ message: "Token invalide ou expiré" });
      }
      req.user = { id: results[0].user_id };
      next();
    }
  );
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
// ============= ROUTES CLIENT ===========================
// =======================================================

// ── Inscription ──
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

// ── Connexion (avec stockage token en base) ──
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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    db.query(
      "INSERT INTO tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
      [token, user.id, expiresAt],
      (err) => {
        if (err) console.error("❌ Erreur insertion token:", err);
      }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, telephone: user.telephone, residence: user.residence }
    });
  });
});

// ── Déconnexion (supprime le token) ──
app.post("/api/auth/logout", authenticate, (req, res) => {
  const auth = req.headers.authorization;
  const token = auth.replace("Bearer ", "");
  db.query("DELETE FROM tokens WHERE token = ?", [token], (err) => {
    if (err) return res.status(500).json({ message: "Erreur déconnexion" });
    res.json({ message: "Déconnecté" });
  });
});

// ── Récupérer tous les trajets disponibles (public) ──
app.get("/api/client/trajets", (req, res) => {
  db.query("SELECT * FROM trajets ORDER BY heure DESC", (err, results) => {
    if (err) {
      console.error("❌ Erreur GET /api/client/trajets:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(results);
  });
});

// ── Détail d’un trajet (public) ──
app.get("/api/client/trajets/:id", (req, res) => {
  const trajetId = req.params.id;
  db.query("SELECT id, depart, destination, heure, places, prix FROM trajets WHERE id = ?", [trajetId], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (results.length === 0) return res.status(404).json({ message: "Trajet non trouvé" });
    res.json(results[0]);
  });
});

// ── Créer un trajet (client) ──
app.post("/api/client/trajets", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places, prix } = req.body;
  if (!destination || !places || !date_depart || !heure_depart || !prix)
    return res.status(400).json({ message: "Champs manquants" });

  const heure = `${date_depart} ${heure_depart}`;
  db.query(
    "INSERT INTO trajets (user_id, depart, destination, heure, places, prix) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, depart || "Position actuelle", destination, heure, places, prix || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json({ id: result.insertId, depart: depart || "Position actuelle", destination, heure, places, prix });
    }
  );
});



// ── Créer une demande (réservation) ──
app.post("/api/client/demandes", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places } = req.body;
  if (!depart || !destination || !date_depart || !heure_depart || !places) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  const sql = "INSERT INTO demandes (user_id, depart, destination, date_depart, heure_depart, places) VALUES (?, ?, ?, ?, ?, ?)";
  const values = [req.user.id, depart, destination, date_depart, heure_depart, places];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Erreur insertion demande:", err);
      return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
    res.status(201).json({ message: "Demande enregistrée avec succès", id: result.insertId });
  });
});
// ── Récupérer ses propres demandes ──
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

// ── Modifier une demande ──
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

// ── Supprimer une demande ──
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
// ── Récupérer les réservations du client ──

// ── Récupérer les réservations du client (covoiturage) avec infos chauffeur et position ──
app.get("/api/client/mes-reservations", authenticate, (req, res) => {
  console.log("🔍 Récupération réservations pour user:", req.user.id);
  
  const sql = `
    SELECT 
      r.id,
      r.places,
      r.prix,
      r.created_at,
      r.status as reservation_status,
      t.id as trip_id,
      t.depart,
      t.destination,
      t.heure,
      u.id as chauffeur_id,
      u.nom as chauffeur_nom,
      u.prenom as chauffeur_prenom,
      u.telephone as chauffeur_telephone,
      d.vehicle_type,
      d.vehicle_plate,
      d.seats as vehicle_seats,
      d.latitude as chauffeur_lat,
      d.longitude as chauffeur_lng,
      d.is_online
    FROM reservations r
    JOIN trajets t ON r.trip_id = t.id
    JOIN users u ON t.user_id = u.id
    LEFT JOIN drivers d ON d.user_id = u.id
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
  `;
  
  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("❌ Erreur SQL:", err);
      return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
    console.log(`✅ ${results.length} réservations trouvées`);
    res.json(results);
  });
});

// ── Réserver un trajet existant ──
app.post("/api/client/reserver", authenticate, (req, res) => {
  const { trip_id, places } = req.body;
  
  if (!trip_id || !places) {
    return res.status(400).json({ message: "trip_id et places requis" });
  }

  // Vérifier que le trajet existe et a assez de places
  db.query("SELECT id, places, prix, user_id as chauffeur_id FROM trajets WHERE id = ?", [trip_id], (err, results) => {
    if (err) {
      console.error("❌ Erreur vérification trajet:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Trajet non trouvé" });
    }

    const trajet = results[0];
    if (trajet.places < places) {
      return res.status(400).json({ message: "Places insuffisantes" });
    }

    // Créer la réservation
    const prixTotal = trajet.prix * places;
    db.query(
      "INSERT INTO reservations (trip_id, user_id, places, prix) VALUES (?, ?, ?, ?)",
      [trip_id, req.user.id, places, prixTotal],
      (err2, result) => {
        if (err2) {
          console.error("❌ Erreur création réservation:", err2);
          return res.status(500).json({ message: "Erreur création réservation" });
        }

        // Mettre à jour le nombre de places du trajet
        db.query(
          "UPDATE trajets SET places = places - ? WHERE id = ?",
          [places, trip_id],
          (err3) => {
            if (err3) console.error("❌ Erreur mise à jour places:", err3);
          }
        );

        res.status(201).json({ 
          message: "Réservation effectuée avec succès", 
          reservationId: result.insertId 
        });
      }
    );
  });
});

// ── Annuler une réservation (covoiturage) ──
app.delete("/api/client/reservations/:id", authenticate, (req, res) => {
  const reservationId = req.params.id;
  
  console.log("🗑️ Suppression réservation:", reservationId, "pour user:", req.user.id);
  
  db.query(
    "DELETE FROM reservations WHERE id = ? AND user_id = ?",
    [reservationId, req.user.id],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur suppression:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Réservation non trouvée" });
      }
      
      // Optionnel : remettre les places dans le trajet
      // db.query("UPDATE trajets SET places = places + ? WHERE id = ?", [places, trip_id]);
      
      res.json({ message: "Réservation annulée avec succès" });
    }
  );
});
// =======================================================
// ============= ROUTES CHAUFFEUR ========================
// =======================================================

// ── Register chauffeur ──
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

// ── Login chauffeur ──
app.post("/api/driver/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email/téléphone et mot de passe requis" });
  }

  const isEmail = email.includes("@") && email.includes(".");
  const isPhone = /^(\+221)?[0-9]{9,12}$/.test(email) || /^[0-9]{9,12}$/.test(email);
  
  let query;
  let params;
  
  if (isEmail) {
    query = `SELECT u.*, d.id as driver_id, d.vehicle_type, d.license_number, d.vehicle_plate, d.seats
             FROM users u 
             JOIN drivers d ON d.user_id = u.id 
             WHERE u.email = ?`;
    params = [email];
  } else if (isPhone) {
    let cleanPhone = email.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("221")) {
      cleanPhone = cleanPhone.substring(3);
    }
    query = `SELECT u.*, d.id as driver_id, d.vehicle_type, d.license_number, d.vehicle_plate, d.seats
             FROM users u 
             JOIN drivers d ON d.user_id = u.id 
             WHERE u.telephone LIKE ?`;
    params = [`%${cleanPhone}`];
  } else {
    return res.status(400).json({ message: "Format d'identifiant invalide" });
  }

  db.query(query, params, async (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (results.length === 0) return res.status(401).json({ message: "Email/téléphone ou mot de passe incorrect" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Email/téléphone ou mot de passe incorrect" });

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
  });
});

// ── Refresh token ──
app.post("/api/driver/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: "Refresh token manquant" });
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, driverId: decoded.driverId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token: newToken });
  } catch (err) {
    res.status(401).json({ message: "Refresh token invalide" });
  }
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
    "INSERT INTO trajets (user_id, depart, destination, heure, places, prix) VALUES ((SELECT user_id FROM drivers WHERE id = ?), ?, ?, ?, ?, ?)",
    [driverId, departure, destination, `${date} ${time}`, seats, price || null],
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

// ── Récupérer les réservations d'un trajet spécifique ──
app.get("/api/trips/reservations", authenticateDriver, (req, res) => {
  const { trip_id } = req.query;
  if (!trip_id) {
    return res.status(400).json({ message: "trip_id requis" });
  }

  const query = `
    SELECT 
      r.id,
      r.places,
      r.status,
      u.nom,
      u.prenom,
      u.telephone
    FROM reservations r
    JOIN users u ON r.user_id = u.id
    WHERE r.trip_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(query, [trip_id], (err, results) => {
    if (err) {
      console.error("❌ Erreur récupération réservations:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(results);
  });
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
  if (!driver_id) return res.status(400). json({ message: "driver_id requis" });

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
// Note: vous devez avoir les colonnes lat et lng dans la table drivers pour que cette route soit complète.
// Actuellement elle ne met à jour que is_online = true.
// ── Mise à jour position chauffeur ──
app.post("/api/driver/update_location", authenticateDriver, (req, res) => {
  const { driver_id, lat, lng } = req.body;
  
  if (!driver_id || lat === undefined || lng === undefined) {
    return res.status(400).json({ message: "driver_id, lat et lng requis" });
  }

  db.query(
    "UPDATE drivers SET is_online = true, latitude = ?, longitude = ? WHERE id = ?",
    [lat, lng, driver_id],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur mise à jour position:", err);
        return res.status(500).json({ message: "Erreur mise à jour position" });
      }
      console.log(`📍 Position mise à jour: chauffeur ${driver_id} -> lat: ${lat}, lng: ${lng}`);
      res.json({ message: "Position mise à jour", lat, lng });
    }
  );
});

// Dans server.js, vérifiez que cette route est correcte
// ── Accepter / Refuser une réservation (version corrigée) ──
// ── Accepter / Refuser une réservation ──
app.post("/api/trips/reservation_action", authenticateDriver, (req, res) => {
  const { reservation_id, status } = req.body;

  console.log("📥 Acceptation réservation reçue:", { reservation_id, status });

  if (!reservation_id || !status) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  if (!["accepted", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  db.query(
    "UPDATE reservations SET status = ? WHERE id = ?",
    [status, reservation_id],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur mise à jour réservation:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Réservation non trouvée" });
      }

      console.log(`✅ Réservation ${reservation_id} passée en ${status}`);
      res.json({ success: true, message: `Réservation ${status}` });
    }
  );
});

// ── Accepter / Refuser une DEMANDE (table demandes) ──
app.post("/api/trips/demande_action", authenticateDriver, (req, res) => {
  const { demande_id, status } = req.body;

  if (!demande_id || !status)
    return res.status(400).json({ message: "Champs manquants" });

  if (!["accepted", "rejected"].includes(status))
    return res.status(400).json({ message: "Statut invalide" });

  db.query(
    "UPDATE demandes SET status = ? WHERE id = ?",
    [status, demande_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Demande non trouvée" });
      res.json({ success: true, message: `Demande ${status}` });
    }
  );
});

// ── Modifier un trajet ──
app.post("/api/trips/update", authenticateDriver, (req, res) => {
  const { trip_id, departure, destination, heure, seats } = req.body;
  if (!trip_id) return res.status(400).json({ message: "trip_id requis" });

  db.query(
    `UPDATE trajets SET
      depart = COALESCE(?, depart),
      destination = COALESCE(?, destination),
      heure = COALESCE(?, heure),
      places = COALESCE(?, places)
     WHERE id = ?`,
    [departure, destination, heure, seats, trip_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Erreur mise à jour" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Trajet introuvable" });
      res.json({ message: "Trajet mis à jour" });
    }
  );
});

// ── Supprimer un trajet ──
app.delete("/api/trips/delete/:id", authenticateDriver, (req, res) => {
  const tripId = req.params.id;
  db.query("SELECT COUNT(*) AS total FROM demandes WHERE trip_id = ? AND status != 'rejected'", [tripId], (err, result) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (result[0].total > 0) {
      return res.status(400).json({ message: "Impossible de supprimer : des réservations existent" });
    }
    db.query("DELETE FROM trajets WHERE id = ?", [tripId], (err2, result2) => {
      if (err2) return res.status(500).json({ message: "Erreur suppression" });
      if (result2.affectedRows === 0) return res.status(404).json({ message: "Trajet introuvable" });
      res.json({ success: true, message: "Trajet supprimé" });
    });
  });
});

// ================= TRANSPORT URBAIN =================

// Récupérer toutes les lignes de bus
app.get("/api/transport/lignes", (req, res) => {
  db.query("SELECT * FROM lignes_bus ORDER BY numero", (err, rows) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    res.json(rows);
  });
});

// Récupérer les arrêts d'une ligne
app.get("/api/transport/lignes/:id/arrets", (req, res) => {
  const ligneId = req.params.id;
  db.query(
    `SELECT a.*, la.ordre, la.heure_theorique
     FROM arrets_bus a
     JOIN ligne_arrets la ON a.id = la.arret_id
     WHERE la.ligne_id = ?
     ORDER BY la.ordre`,
    [ligneId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(rows);
    }
  );
});

// Récupérer les horaires d'une ligne
app.get("/api/transport/lignes/:id/horaires", (req, res) => {
  const ligneId = req.params.id;
  db.query(
    "SELECT * FROM horaires_bus WHERE ligne_id = ? ORDER BY heure_depart",
    [ligneId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(rows);
    }
  );
});

// Recherche d'arrêts par nom
app.get("/api/transport/arrets/search", (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ message: "Requête trop courte" });
  db.query(
    "SELECT id, nom, latitude, longitude FROM arrets_bus WHERE nom LIKE ? ORDER BY nom LIMIT 8",
    [`%${q.trim()}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(rows);
    }
  );
});

// Arrêts proches d'un point (rayon en mètres)
app.get("/api/transport/arrets-proches", (req, res) => {
  const { lat, lon, rayon = 500 } = req.query;
  if (!lat || !lon) return res.status(400).json({ message: "Latitude et longitude requises" });
  const distance = rayon / 111000;
  const sql = `
    SELECT *, (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance_km
    FROM arrets_bus
    WHERE latitude BETWEEN ? - ? AND ? + ?
      AND longitude BETWEEN ? - ? AND ? + ?
    HAVING distance_km < ?
    ORDER BY distance_km
    LIMIT 10
  `;
  db.query(sql, [lat, lon, lat, lat, distance, lat, distance, lon, distance, lon, distance, rayon / 1000], (err, rows) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    res.json(rows);
  });
});

// ================= FONCTIONS GÉOMÉTRIQUES ET INTERPOLATION =================

function distanceBetween(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const dx = px - x1;
  const dy = py - y1;
  const dot = vx * dx + vy * dy;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return distanceBetween(px, py, x1, y1);
  let t = dot / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  const projX = x1 + t * vx;
  const projY = y1 + t * vy;
  return distanceBetween(px, py, projX, projY);
}

function pointToSegmentProjection(px, py, x1, y1, x2, y2) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const dx = px - x1;
  const dy = py - y1;
  const dot = vx * dx + vy * dy;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return 0;
  let t = dot / len2;
  if (t < 0) t = 0;
  if (t > 1) t = 1;
  return t;
}

async function getArretsByLigne(ligneId) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT a.id, a.nom, a.latitude, a.longitude, la.ordre
       FROM arrets_bus a
       JOIN ligne_arrets la ON a.id = la.arret_id
       WHERE la.ligne_id = ?
       ORDER BY la.ordre`,
      [ligneId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

async function getInterpolatedOrder(lat, lon, ligneId, seuilM = 100) {
  const arrets = await getArretsByLigne(ligneId);
  if (arrets.length < 2) return null;
  let minDist = Infinity;
  let bestOrdre = null;
  for (let i = 0; i < arrets.length - 1; i++) {
    const a1 = arrets[i];
    const a2 = arrets[i+1];
    const dist = pointToSegmentDistance(lat, lon, a1.latitude, a1.longitude, a2.latitude, a2.longitude);
    if (dist < minDist && dist < seuilM / 1000) {
      minDist = dist;
      const t = pointToSegmentProjection(lat, lon, a1.latitude, a1.longitude, a2.latitude, a2.longitude);
      bestOrdre = a1.ordre + t * (a2.ordre - a1.ordre);
    }
  }
  return bestOrdre;
}

async function getOrdreForPoint(lat, lon, ligneId) {
  const arretsProches = await findArretsProches(lat, lon, 50);
  for (const a of arretsProches) {
    const lignes = await getLignesByArret(a.id);
    if (lignes.some(l => l.id === ligneId)) {
      return await getOrdreArret(ligneId, a.id);
    }
  }
  return await getInterpolatedOrder(lat, lon, ligneId);
}

// ================= ITINÉRAIRE PRINCIPAL (AVEC INTERPOLATION) =================
app.get("/api/transport/itineraires", async (req, res) => {
  const { lat_depart, lon_depart, lat_arrivee, lon_arrivee } = req.query;
  if (!lat_depart || !lon_depart || !lat_arrivee || !lon_arrivee) {
    return res.status(400).json({ message: "Coordonnées manquantes" });
  }

  try {
    const arretsDepart = await findArretsProches(lat_depart, lon_depart, 500);
    const arretsArrivee = await findArretsProches(lat_arrivee, lon_arrivee, 500);

    if (arretsDepart.length === 0 || arretsArrivee.length === 0) {
      return res.json({ itineraires: [], message: "Aucun arrêt trouvé à proximité" });
    }

    const meilleursItineraires = new Map();

    for (const arretDep of arretsDepart) {
      for (const arretArr of arretsArrivee) {
        if (arretDep.id === arretArr.id) continue;

        const lignesDep = await getLignesByArret(arretDep.id);
        const lignesArr = await getLignesByArret(arretArr.id);

        for (const ligneDep of lignesDep) {
          const ligneArr = lignesArr.find(l => l.id === ligneDep.id);
          if (!ligneArr) continue;

          const ordreDep = await getOrdreForPoint(arretDep.latitude, arretDep.longitude, ligneDep.id);
          const ordreArr = await getOrdreForPoint(arretArr.latitude, arretArr.longitude, ligneDep.id);
          if (ordreDep === null || ordreArr === null || ordreDep === ordreArr) continue;

          const distDepart = distanceBetween(lat_depart, lon_depart, arretDep.latitude, arretDep.longitude);
          const distArrivee = distanceBetween(lat_arrivee, lon_arrivee, arretArr.latitude, arretArr.longitude);
          const sommeDistances = distDepart + distArrivee;

          const itineraire = {
            ligne: {
              id: ligneDep.id,
              numero: ligneDep.numero,
              nom: ligneDep.nom,
            },
            depart: {
              nom: arretDep.nom,
              lat: arretDep.latitude,
              lon: arretDep.longitude,
            },
            arrivee: {
              nom: arretArr.nom,
              lat: arretArr.latitude,
              lon: arretArr.longitude,
            },
            duree_estimee: Math.abs(ordreArr - ordreDep) * 3,
            horaires: await getHorairesProchains(ligneDep.id),
          };

          const key = ligneDep.id;
          if (!meilleursItineraires.has(key) || sommeDistances < meilleursItineraires.get(key).sommeDistances) {
            meilleursItineraires.set(key, { itineraire, sommeDistances });
          }
        }
      }
    }

    const itineraires = Array.from(meilleursItineraires.values()).map(item => item.itineraire);
    res.json({ itineraires });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur calcul itinéraire" });
  }
});

// ================= FONCTIONS UTILITAIRES DE BASE =================
function findArretsProches(lat, lon, rayon) {
  return new Promise((resolve, reject) => {
    const distance = rayon / 111000;
    const sql = `
      SELECT *, (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance_km
      FROM arrets_bus
      WHERE latitude BETWEEN ? - ? AND ? + ?
        AND longitude BETWEEN ? - ? AND ? + ?
      HAVING distance_km < ?
      ORDER BY distance_km
      LIMIT 10
    `;
    db.query(sql, [lat, lon, lat, lat, distance, lat, distance, lon, distance, lon, distance, rayon / 1000], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getLignesByArret(arretId) {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT l.*, la.ordre
       FROM lignes_bus l
       JOIN ligne_arrets la ON l.id = la.ligne_id
       WHERE la.arret_id = ?`,
      [arretId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getOrdreArret(ligneId, arretId) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT ordre FROM ligne_arrets WHERE ligne_id = ? AND arret_id = ?",
      [ligneId, arretId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.length ? rows[0].ordre : null);
      }
    );
  });
}

function getHorairesProchains(ligneId) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const currentTime = `${now.getHours()}:${now.getMinutes()}`;
    db.query(
      `SELECT heure_depart FROM horaires_bus WHERE ligne_id = ? AND heure_depart > ? ORDER BY heure_depart LIMIT 5`,
      [ligneId, currentTime],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.heure_depart));
      }
    );
  });
}

// ================= INTERURBAIN =================

// Récupérer toutes les villes
app.get("/api/interurbain/villes", (req, res) => {
  db.query("SELECT id, nom FROM villes ORDER BY nom", (err, rows) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    res.json(rows);
  });
});

// Récupérer les lignes entre deux villes
app.get("/api/interurbain/recherche", (req, res) => {
  const { depart_id, arrivee_id } = req.query;
  
  // Requête qui fonctionne dans les deux sens
  db.query(
    `SELECT 
      l.id,
      l.duree_estimee,
      l.prix,
      l.compagnie,
      vd.nom as ville_depart, 
      va.nom as ville_arrivee,
      COALESCE(gd.nom, 'Terminus principal') as gare_depart_nom,
      COALESCE(ga.nom, 'Gare centrale') as gare_arrivee_nom
    FROM lignes_interurbaines l
    JOIN villes vd ON l.ville_depart_id = vd.id
    JOIN villes va ON l.ville_arrivee_id = va.id
    LEFT JOIN gares gd ON l.gare_depart_id = gd.id
    LEFT JOIN gares ga ON l.gare_arrivee_id = ga.id
    WHERE (l.ville_depart_id = ? AND l.ville_arrivee_id = ?)
       OR (l.ville_depart_id = ? AND l.ville_arrivee_id = ?)
    `,
    [depart_id, arrivee_id, arrivee_id, depart_id],
    (err, results) => {
      if (err) {
        console.error("❌ Erreur recherche:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.json(results);
    }
  );
});app.get("/api/interurbain/recherche", (req, res) => {
  const { depart_id, arrivee_id } = req.query;
  
  console.log("🔍 Recherche:", { depart_id, arrivee_id });
  
  const sql = `
    SELECT 
      l.id,
      l.duree_estimee,
      l.prix,
      l.compagnie,
      vd.nom as ville_depart, 
      va.nom as ville_arrivee,
      gd.nom as gare_depart_nom,
      ga.nom as gare_arrivee_nom
    FROM lignes_interurbaines l
    JOIN villes vd ON l.ville_depart_id = vd.id
    JOIN villes va ON l.ville_arrivee_id = va.id
    LEFT JOIN gares gd ON l.gare_depart_id = gd.id
    LEFT JOIN gares ga ON l.gare_arrivee_id = ga.id
    WHERE (l.ville_depart_id = ? AND l.ville_arrivee_id = ?)
       OR (l.ville_depart_id = ? AND l.ville_arrivee_id = ?)
  `;
  
  db.query(sql, [depart_id, arrivee_id, arrivee_id, depart_id], (err, results) => {
    if (err) {
      console.error("❌ Erreur recherche:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    console.log("📋 Résultats:", results.map(r => ({ 
      depart: r.ville_depart, 
      arrivee: r.ville_arrivee,
      gare_depart: r.gare_depart_nom,
      gare_arrivee: r.gare_arrivee_nom
    })));
    res.json(results);
  });
});

// Récupérer les horaires d'une ligne
app.get("/api/interurbain/lignes/:id/horaires", (req, res) => {
  const ligneId = req.params.id;
  
  db.query(
    `SELECT h.*, l.prix, l.ville_depart_id, l.ville_arrivee_id
     FROM horaires_interurbains h
     JOIN lignes_interurbaines l ON h.ligne_id = l.id
     WHERE h.ligne_id = ? AND h.statut = 'actif'
     ORDER BY h.heure_depart`,
    [ligneId],
    (err, rows) => {
      if (err) {
        console.error("❌ Erreur horaires:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      console.log(`📋 ${rows.length} horaires trouvés pour la ligne ${ligneId}`);
      res.json(rows);
    }
  );
});
// Récupérer les gares d'une ville
app.get("/api/interurbain/gares/:ville_id", (req, res) => {
  const villeId = req.params.ville_id;
  
  db.query(
    "SELECT id, nom, adresse FROM gares WHERE ville_id = ?",
    [villeId],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(rows);
    }
  );
});
app.post("/api/interurbain/reserver", authenticate, (req, res) => {
  const { horaire_id, places } = req.body;
  
  console.log("📝 Réservation reçue:", { horaire_id, places, user_id: req.user.id });
  
  if (!horaire_id || !places) {
    return res.status(400).json({ message: "Horaire et places requis" });
  }
  
  // Récupérer le prix et les infos
  db.query(
    `SELECT l.prix, l.id as ligne_id, h.heure_depart, h.heure_arrivee
     FROM horaires_interurbains h
     JOIN lignes_interurbaines l ON h.ligne_id = l.id
     WHERE h.id = ?`,
    [horaire_id],
    (err, results) => {
      if (err) {
        console.error("❌ Erreur récupération prix:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: "Horaire non trouvé" });
      }
      
      const prix_total = results[0].prix * places;
      
      db.query(
        `INSERT INTO reservations_interurbaines 
         (user_id, horaire_id, places, prix_total, statut) 
         VALUES (?, ?, ?, ?, 'confirmed')`,
        [req.user.id, horaire_id, places, prix_total],
        (err2, result) => {
          if (err2) {
            console.error("❌ Erreur insertion réservation:", err2);
            return res.status(500).json({ message: "Erreur lors de la réservation" });
          }
          
          console.log("✅ Réservation créée, ID:", result.insertId);
          res.status(201).json({ 
            message: "Réservation effectuée avec succès", 
            reservationId: result.insertId 
          });
        }
      );
    }
  );
});
// ── Récupérer les réservations interurbaines du client ──
// ── Récupérer les réservations interurbaines du client ──
app.get("/api/client/mes-reservations-interurbaines", authenticate, (req, res) => {
  console.log("📋 Récupération réservations interurbaines pour user:", req.user.id);
  
  const sql = `
    SELECT 
      ri.id,
      ri.places,
      ri.prix_total,
      ri.statut,
      ri.date_reservation,
      hi.heure_depart,
      hi.heure_arrivee,
      vd.nom as ville_depart,
      va.nom as ville_arrivee,
      gd.nom as gare_depart,
      ga.nom as gare_arrivee
    FROM reservations_interurbaines ri
    JOIN horaires_interurbains hi ON ri.horaire_id = hi.id
    JOIN lignes_interurbaines l ON hi.ligne_id = l.id
    JOIN villes vd ON l.ville_depart_id = vd.id
    JOIN villes va ON l.ville_arrivee_id = va.id
    LEFT JOIN gares gd ON l.gare_depart_id = gd.id
    LEFT JOIN gares ga ON l.gare_arrivee_id = ga.id
    WHERE ri.user_id = ?
    ORDER BY ri.date_reservation DESC
  `;
  
  db.query(sql, [req.user.id], (err, results) => {
    if (err) {
      console.error("❌ Erreur SQL:", err);
      return res.status(500).json({ message: "Erreur serveur", detail: err.message });
    }
    console.log(`✅ ${results.length} réservations interurbaines trouvées`);
    res.json(results);
  });
});
// ── Supprimer une réservation interurbaine ──
app.delete("/api/client/reservations-interurbaines/:id", authenticate, (req, res) => {
  const reservationId = req.params.id;
  
  console.log("🗑️ Suppression réservation interurbaine:", reservationId);
  
  db.query(
    "DELETE FROM reservations_interurbaines WHERE id = ? AND user_id = ?",
    [reservationId, req.user.id],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur suppression:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Réservation non trouvée" });
      }
      res.json({ message: "Réservation annulée avec succès" });
    }
  );
});

// ── Ajouter des places à une réservation interurbaine ──
app.put("/api/client/reservations-interurbaines/:id/ajouter-places", authenticate, (req, res) => {
  const reservationId = req.params.id;
  const { places_supplementaires } = req.body;
  
  if (!places_supplementaires || places_supplementaires <= 0) {
    return res.status(400).json({ message: "Nombre de places valide requis" });
  }
  
  console.log("➕ Ajout de places:", { reservationId, places_supplementaires });
  
  // Récupérer la réservation et le prix
  db.query(
    `SELECT ri.*, hi.ligne_id, l.prix 
     FROM reservations_interurbaines ri
     JOIN horaires_interurbains hi ON ri.horaire_id = hi.id
     JOIN lignes_interurbaines l ON hi.ligne_id = l.id
     WHERE ri.id = ? AND ri.user_id = ?`,
    [reservationId, req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      if (results.length === 0) return res.status(404).json({ message: "Réservation non trouvée" });
      
      const reservation = results[0];
      const nouveau_total_places = reservation.places + places_supplementaires;
      const nouveau_prix_total = reservation.prix_total + (reservation.prix * places_supplementaires);
      
      db.query(
        "UPDATE reservations_interurbaines SET places = ?, prix_total = ? WHERE id = ? AND user_id = ?",
        [nouveau_total_places, nouveau_prix_total, reservationId, req.user.id],
        (err2) => {
          if (err2) return res.status(500).json({ message: "Erreur mise à jour" });
          res.json({ 
            message: `${places_supplementaires} place(s) ajoutée(s)`, 
            places: nouveau_total_places,
            prix_total: nouveau_prix_total
          });
        }
      );
    }
  );
});
// ================= TEST =================
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