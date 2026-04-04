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
// Récupérer tous les trajets disponibles (public)
app.get("/api/client/trajets", (req, res) => {
  db.query("SELECT * FROM trajets ORDER BY heure DESC", (err, results) => {
    if (err) {
      console.error("❌ Erreur GET /api/client/trajets:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(results);
  });
});
// Détail d’un trajet (public)
app.get("/api/client/trajets/:id", (req, res) => {
  const trajetId = req.params.id;
  db.query("SELECT id, depart, destination, heure, places, prix FROM trajets WHERE id = ?", [trajetId], (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    if (results.length === 0) return res.status(404).json({ message: "Trajet non trouvé" });
    res.json(results[0]);
  });
});

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

app.post("/api/client/demandes", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places, prix, trip_id } = req.body;
  if (!depart || !destination || !date_depart || !heure_depart || !places || !prix)
    return res.status(400).json({ message: "Champs manquants" });

  db.query(
    "INSERT INTO demandes (user_id, depart, destination, date_depart, heure_depart, places, prix, trip_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [req.user.id, depart, destination, date_depart, heure_depart, places, trip_id || null],
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
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email/téléphone et mot de passe requis" });
  }

  // Vérifier si l'identifiant est un email ou un téléphone
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
    // Nettoyer le numéro de téléphone
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

  console.log(`🔐 Tentative login chauffeur avec: ${email} (${isEmail ? "email" : "téléphone"})`);

  db.query(query, params, async (err, results) => {
    if (err) {
      console.error("❌ Erreur DB:", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    
    if (results.length === 0) {
      console.log("❌ Identifiant non trouvé:", email);
      return res.status(401).json({ message: "Email/téléphone ou mot de passe incorrect" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      console.log("❌ Mot de passe incorrect pour:", email);
      return res.status(401).json({ message: "Email/téléphone ou mot de passe incorrect" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET non défini dans .env");
      return res.status(500).json({ message: "Erreur configuration serveur" });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        driverId: user.driver_id 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Login chauffeur réussi pour:", user.email);
    console.log("👤 driverId:", user.driver_id);

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

// ── Refresh token pour "Se souvenir de moi" ──
app.post("/api/driver/refresh", (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token manquant" });
  }
  
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


// ── Google Login (à intégrer plus tard) ──
app.post("/api/driver/google-login", async (req, res) => {
  const { googleToken, email, name } = req.body;
  
  if (!googleToken || !email) {
    return res.status(400).json({ message: "Token Google manquant" });
  }
  
  // Vérifier si l'utilisateur existe déjà
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Erreur serveur" });
    
    let userId;
    let driverId;
    
    if (results.length === 0) {
      // Créer un nouveau compte
      const randomPassword = Math.random().toString(36).substring(2) + Date.now().toString();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      
      db.query(
        "INSERT INTO users (nom, prenom, email, password, role) VALUES (?, ?, ?, ?, 'driver')",
        [name?.split(" ")[0] || "Google", name?.split(" ")[1] || "User", email, hashedPassword],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Erreur création compte" });
          
          userId = result.insertId;
          
          db.query(
            "INSERT INTO drivers (user_id, is_online) VALUES (?, false)",
            [userId],
            (err2, result2) => {
              if (err2) return res.status(500).json({ message: "Erreur création chauffeur" });
              
              driverId = result2.insertId;
              
              const token = jwt.sign(
                { id: userId, email: email, driverId: driverId },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
              );
              
              res.json({
                token,
                user: { id: userId, email, nom: name?.split(" ")[0] || "Google", prenom: name?.split(" ")[1] || "User", driverId }
              });
            }
          );
        }
      );
    } else {
      // Utilisateur existe déjà
      const user = results[0];
      
      // Vérifier si c'est un chauffeur
      db.query("SELECT id FROM drivers WHERE user_id = ?", [user.id], (err, driverResults) => {
        if (err) return res.status(500).json({ message: "Erreur serveur" });
        
        let existingDriverId = null;
        if (driverResults.length > 0) {
          existingDriverId = driverResults[0].id;
        }
        
        const token = jwt.sign(
          { id: user.id, email: user.email, driverId: existingDriverId },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );
        
        res.json({
          token,
          user: { id: user.id, email: user.email, nom: user.nom, prenom: user.prenom, driverId: existingDriverId }
        });
      });
    }
  });
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

  // 1. récupérer la demande
  db.query(
    "SELECT * FROM demandes WHERE id = ?",
    [reservation_id],
    (err, results) => {

      if (err) return res.status(500).json({ message: "Erreur serveur" });

      if (results.length === 0) {
        return res.status(404).json({ message: "Demande introuvable" });
      }

      const demande = results[0];

      // 2. si accepté → créer réservation
      if (status === "accepted") {

        db.query(
          "INSERT INTO reservations (trip_id, user_id, places) VALUES (?, ?, ?)",
          [demande.trip_id, demande.user_id, demande.places],
          (err2) => {

            if (err2) {
              return res.status(500).json({ message: "Erreur création réservation" });
            }

            // 3. update demande
            db.query(
              "UPDATE demandes SET status = 'accepted' WHERE id = ?",
              
              [reservation_id]
            );

            return res.json({ success: true, message: "Réservation créée" });

          }
        );

      }

      // 4. si refusé
      if (status === "rejected") {

        db.query(
          "UPDATE demandes SET status = 'rejected' WHERE id = ?",
          [reservation_id],
          () => {
            return res.json({ success: true, message: "Demande refusée" });
          }
        );

      }

    }
  );

});

//Récuperer les reservation
app.get("/api/trips/reservations", authenticateDriver, (req, res) => {

  const { trip_id } = req.query;

  db.query(
    `SELECT 
      r.id,
      r.places,
      u.nom,
      u.prenom,
      u.telephone
     FROM reservations r
     JOIN users u ON r.user_id = u.id
     WHERE r.trip_id = ?
     ORDER BY r.created_at DESC`,
    [trip_id],
    (err, results) => {

      if (err) return res.status(500).json({ message: "Erreur serveur" });

      res.json(results);

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

  // 1. Vérifier s'il y a des réservations liées
  db.query(
    "SELECT COUNT(*) AS total FROM demandes WHERE trip_id = ? AND status != 'rejected'",
    [tripId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (result[0].total > 0) {
        return res.status(400).json({
          message: "Impossible de supprimer : des réservations existent"
        });
      }

      // 2. Supprimer le trajet
      db.query(
        "DELETE FROM trajets WHERE id = ?",
        [tripId],
        (err2, result2) => {
          if (err2) {
            return res.status(500).json({ message: "Erreur suppression" });
          }
          if (result2.affectedRows === 0) {
            return res.status(404).json({ message: "Trajet introuvable" });
          }
          res.json({ success: true, message: "Trajet supprimé" });
        }
      );
    }
  );
});




// ================= TRANSPORT URBAIN =================

// Récupérer toutes les lignes de bus
app.get("/api/transport/lignes", (req, res) => {
  db.query("SELECT * FROM lignes_bus ORDER BY numero", (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(rows);
  });
});

// Récupérer les arrêts d'une ligne spécifique
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
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
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
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.json(rows);
    }
  );
});

// Arrêts autour d'un point (rayon en mètres)
app.get("/api/transport/arrets-proches", (req, res) => {
  const { lat, lon, rayon = 500 } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ message: "Latitude et longitude requises" });
  }
  // Approximation: 1° ≈ 111 km
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
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.json(rows);
  });
});

app.get("/api/transport/itineraires", async (req, res) => {
  const { lat_depart, lon_depart, lat_arrivee, lon_arrivee } = req.query;
  if (!lat_depart || !lon_depart || !lat_arrivee || !lon_arrivee) {
    return res.status(400).json({ message: "Coordonnées manquantes" });
  }

  try {
    const arretsDepart = await findArretsProches(lat_depart, lon_depart, 300);
    const arretsArrivee = await findArretsProches(lat_arrivee, lon_arrivee, 300);

    console.log("🚏 Arrêts depart trouvés:", arretsDepart.map(a => a.nom));
    console.log("🚏 Arrêts arrivee trouvés:", arretsArrivee.map(a => a.nom));

    if (arretsDepart.length === 0 || arretsArrivee.length === 0) {
      return res.json({ itineraires: [], message: "Aucun arrêt trouvé à proximité" });
    }

    const itineraires = [];

    for (const arretDep of arretsDepart) {
      for (const arretArr of arretsArrivee) {
        if (arretDep.id === arretArr.id) continue;

        const lignesDep = await getLignesByArret(arretDep.id);
        const lignesArr = await getLignesByArret(arretArr.id);

        console.log(`🔍 ${arretDep.nom} → lignes:`, lignesDep.map(l => l.numero));
        console.log(`🔍 ${arretArr.nom} → lignes:`, lignesArr.map(l => l.numero));

        for (const ligneDep of lignesDep) {
          const ligneArr = lignesArr.find(l => l.id === ligneDep.id);
          if (!ligneArr) continue;

          const ordreDep = await getOrdreArret(ligneDep.id, arretDep.id);
          const ordreArr = await getOrdreArret(ligneDep.id, arretArr.id);

          console.log(`📍 Ligne ${ligneDep.numero}: ordre depart=${ordreDep}, ordre arrivee=${ordreArr}`);

          // Accepter les deux sens
          if (ordreDep !== null && ordreArr !== null && ordreDep !== ordreArr) {
            const horaires = await getHorairesProchains(ligneDep.id);
            itineraires.push({
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
              horaires: horaires,
            });
          }
        }
      }
    };

    app.get("/api/transport/itineraires", async (req, res) => {
  const { lat_depart, lon_depart, lat_arrivee, lon_arrivee } = req.query;
  if (!lat_depart || !lon_depart || !lat_arrivee || !lon_arrivee)
    return res.status(400).json({ message: "Coordonnées manquantes" });

  try {
    const arretsDepart = await findArretsProches(lat_depart, lon_depart, 300);
    const arretsArrivee = await findArretsProches(lat_arrivee, lon_arrivee, 300);

    if (arretsDepart.length === 0 || arretsArrivee.length === 0)
      return res.json({ itineraires: [], message: "Aucun arrêt trouvé à proximité" });

    const itineraires = [];

    for (const arretDep of arretsDepart) {
      for (const arretArr of arretsArrivee) {
        if (arretDep.id === arretArr.id) continue;

        const lignesDep = await getLignesByArret(arretDep.id);
        const lignesArr = await getLignesByArret(arretArr.id);

        for (const ligneDep of lignesDep) {
          const ligneArr = lignesArr.find(l => l.id === ligneDep.id);
          if (!ligneArr) continue;

          const ordreDep = await getOrdreArret(ligneDep.id, arretDep.id);
          const ordreArr = await getOrdreArret(ligneDep.id, arretArr.id);

          if (ordreDep !== null && ordreArr !== null && ordreDep !== ordreArr) {
            const horaires = await getHorairesProchains(ligneDep.id);
            itineraires.push({
              ligne: { id: ligneDep.id, numero: ligneDep.numero, nom: ligneDep.nom },
              depart: { nom: arretDep.nom, lat: arretDep.latitude, lon: arretDep.longitude },
              arrivee: { nom: arretArr.nom, lat: arretArr.latitude, lon: arretArr.longitude },
              duree_estimee: Math.abs(ordreArr - ordreDep) * 3,
              horaires
            });
          }
        }
      }
    }

    const uniques = itineraires.filter((it, idx, self) =>
      idx === self.findIndex(t => t.ligne.id === it.ligne.id && t.depart.nom === it.depart.nom && t.arrivee.nom === it.arrivee.nom)
    );

    res.json({ itineraires: uniques });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur calcul itinéraire" });
  }
});

// ================= FONCTIONS UTILITAIRES (transport) =================
// Note: Ces fonctions utilisent db, donc doivent être déclarées après la connexion.

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



// =======================================================
// ================= TEST ================================
// =======================================================
app.get("/api/test", (req, res) => {
  db.query("SELECT 1+1 AS result", (err, results) => {
    if (err) return res.json({ status: "MySQL ❌", error: err.message });
    res.json({ status: "MySQL ✅", solution: results[0].result, database: process.env.DB_NAME });
  });
});

// Rechercher des arrêts par nom (autocomplétion)
app.get("/api/transport/arrets/search", (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ message: "Requête trop courte" });
  }
  db.query(
    `SELECT id, nom, latitude, longitude FROM arrets_bus WHERE nom LIKE ? ORDER BY nom LIMIT 8`,
    [`%${q.trim()}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erreur serveur" });
      res.json(rows);
    }
  );
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Serveur démarré sur le port " + PORT);
});
