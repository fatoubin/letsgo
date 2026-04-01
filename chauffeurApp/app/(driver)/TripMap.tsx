import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Dimensions } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as SecureStore from "expo-secure-store";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const { width } = Dimensions.get("window");

export default function DriverTripMapScreen() {

  const params = useLocalSearchParams();

  // ── Trip passé en JSON depuis TripScreen ──
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);

  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [endPoint, setEndPoint] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [instruction, setInstruction] = useState("Démarrage navigation...");
  const [eta, setEta] = useState("");
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSpoken, setLastSpoken] = useState("");

  // ── Lire driverId ──
  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (stored) setDriverId(Number(stored));
    };
    load();
  }, []);

  // ── Boussole ──
  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  // ── GPS Chauffeur ──
  useEffect(() => {
    let sub: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 3000, distanceInterval: 5 },
        async loc => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setDriverLocation(pos);

          // ── Envoyer position au serveur (bonne route) ──
          if (driverId) {
            try {
              await fetch(`${API_URL}/api/driver/update_location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ driver_id: driverId, lat: pos.latitude, lng: pos.longitude })
              });
            } catch (e) {
              console.log("❌ LOCATION UPDATE ERROR", e);
            }
          }

          if (mapRef.current) {
            mapRef.current.animateCamera({ center: pos, pitch: 60, heading, zoom: 18 });
          }
        }
      );
    })();

    return () => { if (sub) sub.remove(); };
  }, [heading, driverId]);

  // ── Geocoder la destination depuis le nom du trip ──
  // ── Geocoder la destination depuis le nom du trip (VERSION CORRIGÉE) ──
useEffect(() => {
  if (!trip?.destination) return;

  const geocodeDestination = async () => {
    try {
      const destinationName = trip.destination;
      
      // Liste des variations de recherche pour plus de chances de succès
      const searchVariations = [
        destinationName,
        `${destinationName}, Sénégal`,
        `${destinationName}, Dakar, Sénégal`,
        `${destinationName}, Thiès, Sénégal`,
        `${destinationName}, Mbour, Sénégal`,
        `${destinationName}, Région de Thiès`,
        `${destinationName}, Région de Dakar`,
      ];
      
      let foundLocation = null;
      
      // Essayer chaque variation
      for (const query of searchVariations) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
        
        console.log(`🔍 Recherche de: ${query}`);
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.status === "OK" && json.results?.length > 0) {
          const loc = json.results[0].geometry.location;
          const formattedAddress = json.results[0].formatted_address;
          console.log(`✅ Trouvé: ${formattedAddress}`);
          foundLocation = { latitude: loc.lat, longitude: loc.lng };
          break;
        }
      }
      
      // Si toujours pas trouvé, utiliser les coordonnées de fallback
      if (!foundLocation) {
        console.log(`⚠️ Aucun résultat pour ${destinationName}, utilisation des coordonnées de fallback`);
        
        // Coordonnées approximatives pour les villes principales du Sénégal
        const fallbackCoords: { [key: string]: { lat: number; lng: number } } = {
          "dakar": { lat: 14.6937, lng: -17.4441 },
          "thies": { lat: 14.7910, lng: -16.9259 },
          "thiès": { lat: 14.7910, lng: -16.9259 },
          "touba": { lat: 14.8575, lng: -15.8766 },
          "mbour": { lat: 14.4056, lng: -16.9647 },
          "saint louis": { lat: 16.0283, lng: -16.5000 },
          "saint-louis": { lat: 16.0283, lng: -16.5000 },
          "kaolack": { lat: 14.1522, lng: -16.0727 },
          "ziguinchor": { lat: 12.5708, lng: -16.2694 },
          "diourbel": { lat: 14.6479, lng: -16.2438 },
          "louga": { lat: 15.6187, lng: -16.2287 },
          "tambacounda": { lat: 13.7716, lng: -13.6673 },
          "kolda": { lat: 12.8943, lng: -14.9444 },
          "matam": { lat: 15.6585, lng: -13.2500 },
          "kedougou": { lat: 12.5520, lng: -12.1807 },
          "sedhiou": { lat: 12.7078, lng: -15.5569 },
          "bignona": { lat: 12.8092, lng: -16.2264 },
          "fatick": { lat: 14.3345, lng: -16.4161 },
          "kaffrine": { lat: 14.1058, lng: -15.5500 },
          "kédougou": { lat: 12.5520, lng: -12.1807 },
        };
        
        const lowerName = destinationName.toLowerCase();
        for (const [city, coords] of Object.entries(fallbackCoords)) {
          if (lowerName.includes(city) || city.includes(lowerName)) {
            console.log(`📍 Fallback trouvé pour ${city}: (${coords.lat}, ${coords.lng})`);
            foundLocation = { latitude: coords.lat, longitude: coords.lng };
            break;
          }
        }
      }
      
      if (foundLocation) {
        setEndPoint(foundLocation);
      } else {
        console.log("❌ Geocoding: aucun résultat pour", destinationName);
        // Optionnel: afficher une alerte à l'utilisateur
        // Alert.alert("Destination non trouvée", `La destination "${destinationName}" n'a pas pu être localisée.`);
      }
      
    } catch (e) {
      console.log("❌ GEOCODING ERROR", e);
    }
  };

  geocodeDestination();
}, [trip]);

  // ── Calcul route + instructions vocales ──
  const fetchRoute = async () => {
    if (!driverLocation || !endPoint) return;

    try {
      const url =
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${driverLocation.latitude},${driverLocation.longitude}` +
        `&destination=${endPoint.latitude},${endPoint.longitude}` +
        `&mode=driving&key=${GOOGLE_MAPS_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (!json.routes?.length) return;

      const route = json.routes[0];
      const leg = route.legs[0];

      setEta(`${leg.duration.text} • ${leg.distance.text}`);

      const nextStep = leg.steps[0]?.html_instructions?.replace(/<[^>]+>/g, "");
      if (nextStep) {
        setInstruction(nextStep);
        if (nextStep !== lastSpoken) {
          Speech.speak(nextStep, { language: "fr", rate: 0.9 });
          setLastSpoken(nextStep);
        }
      }

      const decoded = decodePolyline(route.overview_polyline.points);
      setRouteCoords(decoded);
      setLoading(false);

    } catch (e) {
      console.log("❌ NAV ERROR", e);
    }
  };

  useEffect(() => {
    if (driverLocation && endPoint) fetchRoute();
  }, [driverLocation, endPoint]);

  // ── Recalcul si sortie de route (> 60m) ──
  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return;

    let minDistance = Infinity;
    routeCoords.forEach(p => {
      const d = distanceBetween(driverLocation, p);
      if (d < minDistance) minDistance = d;
    });

    if (minDistance > 60) fetchRoute();
  }, [driverLocation]);

  if (loading || !driverLocation || !endPoint) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Navigation en cours...</Text>
        {trip?.destination && (
          <Text style={{ marginTop: 6, color: "#999", fontSize: 13 }}>
            Vers : {trip.destination}
          </Text>
        )}
      </View>
    );
  }

  const isNight = new Date().getHours() >= 19 || new Date().getHours() <= 6;

  return (
    <View style={{ flex: 1 }}>

      {/* ── Bandeau instructions ── */}
      <View style={[styles.banner, isNight && styles.bannerNight]}>
        <Text style={styles.instructionText}>🧭 {instruction}</Text>
        <Text style={styles.etaText}>⏱️ {eta}</Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        customMapStyle={isNight ? nightMapStyle : []}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        <Marker coordinate={driverLocation} rotation={heading} flat>
          <Text style={{ fontSize: 28 }}>🚗</Text>
        </Marker>

        <Marker
          coordinate={endPoint}
          title={trip?.destination ?? "Arrivée"}
          pinColor="red"
        />

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={6}
            strokeColor="#2563EB"
          />
        )}
      </MapView>

    </View>
  );
}

// ── Distance entre 2 points GPS (mètres) ──
function distanceBetween(a: any, b: any) {
  const R = 6371e3;
  const φ1 = a.latitude * Math.PI / 180;
  const φ2 = b.latitude * Math.PI / 180;
  const Δφ = (b.latitude - a.latitude) * Math.PI / 180;
  const Δλ = (b.longitude - a.longitude) * Math.PI / 180;
  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// ── Décoder polyline Google ──
function decodePolyline(encoded: string) {
  const points: any[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  banner: {
    position: "absolute",
    top: 40,
    width: width - 20,
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    zIndex: 10,
    elevation: 5
  },
  bannerNight: { backgroundColor: "#111827" },
  instructionText: { fontSize: 16, fontWeight: "700", color: "#2563EB", textAlign: "center" },
  etaText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 4 }
});

const nightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1f2933" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] }
];