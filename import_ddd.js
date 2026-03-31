// import_ddd.js
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Configuration de votre base TiDB Cloud
const config = {
  host: process.env.DB_HOST || "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  user: process.env.DB_USER || "3CHU1k2srF5BDDf.root",
  password: process.env.DB_PASSWORD || "1DhexcHz4FEoMRa1",
  database: process.env.DB_NAME || "letgoDB",
  port: 4000,
  ssl: { rejectUnauthorized: false }
};

// Lire le fichier DDD.txt
const filePath = path.join(__dirname, 'DDD.txt');
const content = fs.readFileSync(filePath, 'utf-8');

// Découper par lignes et analyser
const lines = content.split('\n');
let currentLigne = null;
let currentArrets = [];
const lignesData = [];
const allArrets = new Set(); // pour éviter les doublons d'arrêts

// Expressions régulières pour reconnaître les en-têtes de ligne
const ligneRegex = /^LIGNE\s+(\d+[A-Z]*)\s*:\s*(.*)$/i;
const tafTafRegex = /^LIGNE\s+TAF\s+TAF/i;
const autreRegex = /^LIGNE\s+:\s*(.*)$/i; // cas comme "Ligne : RUFISQUE <--> YENNE"

for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();
  if (line === '') continue;

  // Détecter un titre de ligne
  let match = ligneRegex.exec(line);
  if (!match && tafTafRegex.test(line)) {
    match = ['LIGNE TAF TAF', 'TAF TAF', 'TAF TAF (circulaire)'];
  }
  if (!match && autreRegex.test(line)) {
    match = autreRegex.exec(line);
    match = ['LIGNE ' + match[1], '', match[1]];
  }

  if (match) {
    // Sauvegarder la ligne précédente
    if (currentLigne !== null && currentArrets.length > 0) {
      lignesData.push({
        numero: currentLigne.numero,
        nom: currentLigne.nom,
        arrets: [...currentArrets]
      });
    }
    // Nouvelle ligne
    let numero, nom;
    if (match[1] === 'TAF TAF') {
      numero = 'TAF';
      nom = 'TAF TAF (circulaire)';
    } else {
      numero = match[1].trim();
      nom = match[2].trim();
      if (nom === '') nom = match[0].replace(/^LIGNE\s*:?\s*/, '').trim();
    }
    currentLigne = { numero, nom };
    currentArrets = [];
  } else {
    // Sinon, c'est un arrêt (commence par un tiret ou pas, on prend la ligne)
    let arret = line.replace(/^–\s*/, '').trim();
    if (arret !== '' && !arret.match(/^LIGNE/i)) {
      currentArrets.push(arret);
      allArrets.add(arret);
    }
  }
}
// Dernière ligne
if (currentLigne !== null && currentArrets.length > 0) {
  lignesData.push({
    numero: currentLigne.numero,
    nom: currentLigne.nom,
    arrets: [...currentArrets]
  });
}

console.log(`📊 ${lignesData.length} lignes trouvées, ${allArrets.size} arrêts uniques.`);

// Connexion et insertion
(async () => {
  const conn = await mysql.createConnection(config);
  console.log("✅ Connecté à TiDB Cloud");

  try {
    // Nettoyer les anciennes données (optionnel, mais recommandé)
    await conn.query("DELETE FROM ligne_arrets");
    await conn.query("DELETE FROM horaires_bus");
    await conn.query("DELETE FROM arrets_bus");
    await conn.query("DELETE FROM lignes_bus");

    // 1. Insérer les arrêts uniques
    const arretMap = new Map(); // nom -> id
    for (const arretName of allArrets) {
      const [result] = await conn.query(
        "INSERT INTO arrets_bus (nom, latitude, longitude) VALUES (?, NULL, NULL)",
        [arretName]
      );
      arretMap.set(arretName, result.insertId);
    }
    console.log(`📍 ${arretMap.size} arrêts insérés.`);

    // 2. Insérer les lignes
    const ligneMap = new Map(); // numero -> id
    for (const ligne of lignesData) {
      const [result] = await conn.query(
        "INSERT INTO lignes_bus (numero, nom, type) VALUES (?, ?, ?)",
        [ligne.numero, ligne.nom, 'urbain']
      );
      ligneMap.set(ligne.numero, result.insertId);
    }
    console.log(`🚌 ${ligneMap.size} lignes insérées.`);

   // 3. Insérer les relations ligne_arrets (ordre) avec INSERT IGNORE
for (const ligne of lignesData) {
  const ligneId = ligneMap.get(ligne.numero);
  if (!ligneId) continue;
  let ordre = 1;
  const seen = new Set();
  for (const arretName of ligne.arrets) {
    const arretId = arretMap.get(arretName);
    if (arretId && !seen.has(arretId)) {
      seen.add(arretId);
      await conn.query(
        "INSERT IGNORE INTO ligne_arrets (ligne_id, arret_id, ordre) VALUES (?, ?, ?)",
        [ligneId, arretId, ordre]
      );
      ordre++;
    } else if (arretId && seen.has(arretId)) {
      console.warn(`⚠️ Doublon ignoré pour ligne ${ligne.numero}, arrêt ${arretName}`);
    }
  }
  console.log(`🔗 Ligne ${ligne.numero} : ${ordre-1} arrêts liés.`);
}

    console.log("✅ Importation terminée !");
  } catch (err) {
    console.error("❌ Erreur :", err);
  } finally {
    await conn.end();
  }
})();