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

// ================= CRÉER UN TRAJET =================
app.post("/api/client/trajets", authenticate, (req, res) => {

  const { depart, destination, date_depart, heure_depart, places } = req.body;

  console.log("Création trajet - user:", req.user.id);

  if (!destination || !places || !date_depart || !heure_depart) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  const heure = `${date_depart} ${heure_depart}`;

  db.query(
    "INSERT INTO trajets (user_id, depart, destination, heure, places) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      depart || "Position actuelle",
      destination,
      heure,
      places
    ],
    (err, result) => {

      if (err) {
        console.error("❌ Erreur création trajet:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }

      console.log("✅ Trajet créé:", result.insertId);

      res.json({
        id: result.insertId,
        depart: depart || "Position actuelle",
        destination,
        heure,
        places
      });

    }
  );

});
// ================= planifier  UN TRAJET =================
// ================= ROUTES POUR LES DEMANDES (planifier) =================

// Créer une demande (besoin client)
app.post("/api/client/demandes", authenticate, (req, res) => {
  const { depart, destination, date_depart, heure_depart, places } = req.body;
  
  if (!depart || !destination || !date_depart || !heure_depart || !places) {
    return res.status(400).json({ message: "Champs manquants" });
  }
  
  db.query(
    "INSERT INTO demandes (user_id, depart, destination, date_depart, heure_depart, places) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, depart, destination, date_depart, heure_depart, places],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur création demande:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.status(201).json({ 
        message: "Demande enregistrée avec succès", 
        id: result.insertId 
      });
    }
  );
});

// Optionnel : Voir ses propres demandes
app.get("/api/client/mes-demandes", authenticate, (req, res) => {
  db.query(
    "SELECT * FROM demandes WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, results) => {
      if (err) {
        console.error("❌ Erreur récupération demandes:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      res.json(results);
    }
  );
});
// Modifier une demande (vérification propriétaire)
app.put("/api/client/demandes/:id", authenticate, (req, res) => {
  const demandeId = req.params.id;
  const { depart, destination, date_depart, heure_depart, places } = req.body;

  if (!depart || !destination || !date_depart || !heure_depart || !places) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  db.query(
    "UPDATE demandes SET depart = ?, destination = ?, date_depart = ?, heure_depart = ?, places = ? WHERE id = ? AND user_id = ?",
    [depart, destination, date_depart, heure_depart, places, demandeId, req.user.id],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur modification demande:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Demande non trouvée ou non autorisée" });
      }
      res.json({ message: "Demande modifiée avec succès" });
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

// Supprimer une demande (vérification propriétaire)
app.delete("/api/client/demandes/:id", authenticate, (req, res) => {
  const demandeId = req.params.id;
  db.query(
    "DELETE FROM demandes WHERE id = ? AND user_id = ?",
    [demandeId, req.user.id],
    (err, result) => {
      if (err) {
        console.error("❌ Erreur suppression demande:", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Demande non trouvée" });
      }
      res.json({ message: "Demande supprimée" });
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

// Itinéraire (lignes reliant deux points)
app.get("/api/transport/itineraires", async (req, res) => {
  const { lat_depart, lon_depart, lat_arrivee, lon_arrivee } = req.query;
  if (!lat_depart || !lon_depart || !lat_arrivee || !lon_arrivee) {
    return res.status(400).json({ message: "Coordonnées manquantes" });
  }

  try {
    // Fonctions utilitaires définies en interne (ou déclarées globalement)
    const arretsDepart = await findArretsProches(lat_depart, lon_depart, 500);
    const arretsArrivee = await findArretsProches(lat_arrivee, lon_arrivee, 500);

    if (arretsDepart.length === 0 || arretsArrivee.length === 0) {
      return res.json({ itineraires: [], message: "Aucun arrêt trouvé à proximité" });
    }

    // Récupérer les lignes pour chaque arrêt
    const lignesParArret = {};
    for (const arret of [...arretsDepart, ...arretsArrivee]) {
      lignesParArret[arret.id] = await getLignesByArret(arret.id);
    }

    const itineraires = [];
    for (const arretDep of arretsDepart) {
      const lignesDep = lignesParArret[arretDep.id];
      for (const arretArr of arretsArrivee) {
        const lignesArr = lignesParArret[arretArr.id];
        // Chercher les lignes communes
        for (const ligneDep of lignesDep) {
          const ligneArr = lignesArr.find(l => l.id === ligneDep.id);
          if (ligneArr) {
            const ordreDep = await getOrdreArret(ligneDep.id, arretDep.id);
            const ordreArr = await getOrdreArret(ligneDep.id, arretArr.id);
            if (ordreDep !== null && ordreArr !== null && ordreDep < ordreArr) {
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
                duree_estimee: (ordreArr - ordreDep) * 3, // 3 minutes par arrêt
                horaires: horaires,
              });
            }
          }
        }
      }
    }

    // Supprimer les doublons (même ligne, mêmes arrêts)
    const uniques = itineraires.filter((it, idx, self) =>
      idx === self.findIndex(t => t.ligne.id === it.ligne.id && t.depart.nom === it.depart.nom && t.arrivee.nom === it.arrivee.nom)
    );

    res.json({ itineraires: uniques });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur calcul itinéraire" });
  }
});

// ================= FONCTIONS UTILITAIRES (à déclarer avant les routes) =================
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

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Serveur démarré sur le port " + PORT);
});