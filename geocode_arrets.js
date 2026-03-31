const mysql = require('mysql2/promise');

const config = {
  host: "gateway01.eu-central-1.prod.aws.tidbcloud.com",
  user: "3CHU1k2srF5BDDf.root",
  password: "1DhexcHz4FEoMRa1",
  database: "letgoDB",
  port: 4000,
  ssl: { rejectUnauthorized: false }
};

const GOOGLE_API_KEY = "AIzaSyDfq25kW4d-Td3LZeM3HUO38XGcyxRxkE8"; // <--- À remplacer

async function geocodeArrets() {
  const conn = await mysql.createConnection(config);
  console.log("✅ Connecté à TiDB Cloud");

  const [rows] = await conn.query("SELECT id, nom FROM arrets_bus WHERE latitude IS NULL");
  console.log(`📍 ${rows.length} arrêts à géocoder.`);

  let success = 0, fail = 0;
  for (const arret of rows) {
    const adresse = `${arret.nom}, Dakar, Sénégal`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(adresse)}&components=country:SN&key=${GOOGLE_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === "OK" && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        await conn.query("UPDATE arrets_bus SET latitude = ?, longitude = ? WHERE id = ?", [lat, lng, arret.id]);
        console.log(`✅ ${arret.nom} → (${lat}, ${lng})`);
        success++;
      } else {
        console.warn(`⚠️ Échec pour ${arret.nom} (${data.status})`);
        fail++;
      }
    } catch (err) {
      console.error(`❌ Erreur ${arret.nom}:`, err.message);
      fail++;
    }
    await new Promise(r => setTimeout(r, 200)); // Pause pour quota
  }

  console.log(`\n🎉 Terminé : ${success} succès, ${fail} échecs.`);
  await conn.end();
}

geocodeArrets();