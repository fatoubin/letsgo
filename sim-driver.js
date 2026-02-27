const io = require("socket.io-client");
const socket = io("http://localhost:3000");

// Chauffeurs simulés avec trajet Dakar → Thiès
let drivers = [
    { id: "driver1", from: "Dakar", to: "Thiès", lat: 14.6937, lng: -17.4441 },
    { id: "driver2", from: "Dakar", to: "Thiès", lat: 14.7000, lng: -17.4500 },
    { id: "driver3", from: "Dakar", to: "Thiès", lat: 14.6900, lng: -17.4300 }
];

socket.on("connect", () => {
    console.log("🚗 Simulateur connecté !");

    // Déclarer trajet pour chaque chauffeur
    drivers.forEach(d => {
        socket.emit("driverTrip", {
            driverId: d.id,
            from: d.from,
            to: d.to
        });
    });
});

// Envoyer la position de chaque chauffeur toutes les 3 sec
setInterval(() => {
    drivers = drivers.map((d) => {
        d.lat += (Math.random() - 0.5) * 0.002;
        d.lng += (Math.random() - 0.5) * 0.002;

        socket.emit("driverPosition", d);
        return d;
    });
}, 3000);
