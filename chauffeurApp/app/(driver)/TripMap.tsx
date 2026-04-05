import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Dimensions,
  Alert,
  TouchableOpacity
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as SecureStore from "expo-secure-store";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";
import { COLORS } from "../../src/styles/colors";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const { width } = Dimensions.get("window");

// ── Throttle envoi position ──
let lastLocationSent = 0;

// ============================================================
// COORDONNÉES DES VILLES SÉNÉGALAISES
// ============================================================
const SENEGAL_CITIES: { [key: string]: { lat: number; lng: number; name: string } } = {
  "dakar": { lat: 14.6937, lng: -17.4441, name: "Dakar" },
  "thies": { lat: 14.7910, lng: -16.9259, name: "Thiès" },
  "thiès": { lat: 14.7910, lng: -16.9259, name: "Thiès" },
  "touba": { lat: 14.8575, lng: -15.8766, name: "Touba" },
  "mbour": { lat: 14.4056, lng: -16.9647, name: "Mbour" },
  "saint louis": { lat: 16.0283, lng: -16.5000, name: "Saint-Louis" },
  "saint-louis": { lat: 16.0283, lng: -16.5000, name: "Saint-Louis" },
  "kaolack": { lat: 14.1522, lng: -16.0727, name: "Kaolack" },
  "ziguinchor": { lat: 12.5708, lng: -16.2694, name: "Ziguinchor" },
  "diourbel": { lat: 14.6479, lng: -16.2438, name: "Diourbel" },
  "louga": { lat: 15.6187, lng: -16.2287, name: "Louga" },
  "tambacounda": { lat: 13.7716, lng: -13.6673, name: "Tambacounda" },
  "kolda": { lat: 12.8943, lng: -14.9444, name: "Kolda" },
  "matam": { lat: 15.6585, lng: -13.2500, name: "Matam" },
  "kedougou": { lat: 12.5520, lng: -12.1807, name: "Kédougou" },
  "sedhiou": { lat: 12.7078, lng: -15.5569, name: "Sédhiou" },
  "bignona": { lat: 12.8092, lng: -16.2264, name: "Bignona" },
  "fatick": { lat: 14.3345, lng: -16.4161, name: "Fatick" },
  "kaffrine": { lat: 14.1058, lng: -15.5500, name: "Kaffrine" },
  "guediawaye": { lat: 14.7768, lng: -17.3940, name: "Guédiawaye" },
  "pikine": { lat: 14.7545, lng: -17.3997, name: "Pikine" },
  "rufisque": { lat: 14.7165, lng: -17.2717, name: "Rufisque" },
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================
function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCityCoordinates(cityName: string): { lat: number; lng: number; name: string } | null {
  const normalized = cityName.toLowerCase().trim();
  if (SENEGAL_CITIES[normalized]) return SENEGAL_CITIES[normalized];
  for (const [key, value] of Object.entries(SENEGAL_CITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) return value;
  }
  return null;
}

function generateSimpleRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Array<{ latitude: number; longitude: number }> {
  const points = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      latitude: start.lat + (end.lat - start.lat) * t,
      longitude: start.lng + (end.lng - start.lng) * t,
    });
  }
  return points;
}

// ── Décoder polyline Google (si API disponible) ──
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = [];
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

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function DriverTripMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);
  const watchPositionRef = useRef<Location.LocationSubscription | null>(null);

  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

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
    let subscription: any;
    const startMagnetometer = async () => {
      const { status } = await Magnetometer.requestPermissionsAsync();
      if (status === "granted") {
        subscription = Magnetometer.addListener(data => {
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          setHeading(angle >= 0 ? angle : angle + 360);
        });
      }
    };
    startMagnetometer();
    return () => { if (subscription) subscription.remove(); };
  }, []);

  // ── GPS Chauffeur ──
  useEffect(() => {
    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission GPS refusée");
        return;
      }

      watchPositionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        async (location) => {
          const pos = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setDriverLocation(pos);

          // ── ✅ CORRECTION : Envoyer position au serveur avec throttle 10s + JWT ──
          const now = Date.now();
          if (driverId && now - lastLocationSent > 10000) {
            lastLocationSent = now;
            try {
              const token = await SecureStore.getItemAsync("token");
              await fetch(`${API_URL}/api/driver/update_location`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ driver_id: driverId, lat: pos.latitude, lng: pos.longitude })
              });
            } catch (e) {
              console.log("❌ LOCATION UPDATE ERROR", e);
            }
          }

          // Mettre à jour distance restante
          if (destination) {
            const dist = distanceBetween(pos.latitude, pos.longitude, destination.latitude, destination.longitude);
            setRemainingDistance(dist);
            const timeMinutes = (dist / 1000) / 60 * 60;
            if (timeMinutes < 60) {
              setEstimatedTime(`${Math.round(timeMinutes)} min`);
            } else {
              const hours = Math.floor(timeMinutes / 60);
              const minutes = Math.round(timeMinutes % 60);
              setEstimatedTime(`${hours}h ${minutes}min`);
            }
          }

          if (mapRef.current && isNavigating) {
            mapRef.current.animateCamera({ center: pos, pitch: 45, heading, zoom: 17 });
          }
        }
      );
    };

    startWatching();
    return () => { if (watchPositionRef.current) watchPositionRef.current.remove(); };
  }, [destination, heading, isNavigating, driverId]);

  // ── Initialiser destination ──
  useEffect(() => {
    if (!trip?.destination) { setLoading(false); return; }

    const initializeDestination = async () => {
      // 1. Essayer Google Geocoding si clé disponible
      if (GOOGLE_MAPS_KEY) {
        try {
          const queries = [
            `${trip.destination}, Sénégal`,
            `${trip.destination}, Senegal`,
            trip.destination,
          ];
          for (const query of queries) {
            const url =
              `https://maps.googleapis.com/maps/api/geocode/json?` +
              `address=${encodeURIComponent(query)}&region=sn&language=fr&key=${GOOGLE_MAPS_KEY}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.results?.length) {
              const loc = json.results[0].geometry.location;
              setDestination({ latitude: loc.lat, longitude: loc.lng, name: trip.destination });
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.log("❌ Geocoding error, fallback local", e);
        }
      }

      // 2. Fallback : coordonnées locales
      const cityCoords = getCityCoordinates(trip.destination);
      if (cityCoords) {
        setDestination({ latitude: cityCoords.lat, longitude: cityCoords.lng, name: cityCoords.name });
      } else {
        setDestination({ latitude: 14.6937, longitude: -17.4441, name: "Dakar" });
      }
      setLoading(false);
    };

    initializeDestination();
  }, [trip]);

  // ── Calculer itinéraire ──
  useEffect(() => {
    if (!driverLocation || !destination) return;

    const calculateRoute = async () => {
      // 1. Essayer Google Directions si clé disponible
      if (GOOGLE_MAPS_KEY) {
        try {
          const url =
            `https://maps.googleapis.com/maps/api/directions/json?` +
            `origin=${driverLocation.latitude},${driverLocation.longitude}` +
            `&destination=${destination.latitude},${destination.longitude}` +
            `&mode=driving&key=${GOOGLE_MAPS_KEY}`;
          const res = await fetch(url);
          const json = await res.json();
          if (json.routes?.length) {
            const decoded = decodePolyline(json.routes[0].overview_polyline.points);
            setRouteCoords(decoded);
            setIsNavigating(true);
            return;
          }
        } catch (e) {
          console.log("❌ Directions error, fallback simple route", e);
        }
      }

      // 2. Fallback : ligne droite
      const route = generateSimpleRoute(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: destination.latitude, lng: destination.longitude }
      );
      setRouteCoords(route);

      const dist = distanceBetween(driverLocation.latitude, driverLocation.longitude, destination.latitude, destination.longitude);
      setRemainingDistance(dist);
      const timeMinutes = (dist / 1000) / 60 * 60;
      setEstimatedTime(timeMinutes < 60 ? `${Math.round(timeMinutes)} min` : `${Math.floor(timeMinutes / 60)}h ${Math.round(timeMinutes % 60)}min`);
      setIsNavigating(true);
    };

    calculateRoute();
  }, [driverLocation, destination]);

  // ── Instructions vocales ──
  useEffect(() => {
    if (!isNavigating || remainingDistance <= 0) return;
    if (remainingDistance < 100) {
      Speech.speak("Vous êtes arrivé à destination", { language: "fr" });
    } else if (remainingDistance < 500) {
      Speech.speak("Dans 500 mètres, vous arrivez à destination", { language: "fr" });
    }
  }, [Math.floor(remainingDistance / 500)]);

  // ── Arrivée à destination ──
  const handleArrived = () => {
    Alert.alert(
      "Arrivée à destination",
      "Avez-vous terminé la course ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, terminer",
          onPress: () => {
            Speech.speak("Course terminée", { language: "fr" });
            router.back();
          },
        },
      ]
    );
  };

  if (loading || !driverLocation || !destination) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Préparation de la navigation...</Text>
        {trip?.destination && (
          <Text style={styles.destinationText}>Vers : {trip.destination}</Text>
        )}
      </View>
    );
  }

  const distanceKm = (remainingDistance / 1000).toFixed(1);
  const isNearDestination = remainingDistance < 100;

  return (
    <View style={styles.container}>

      {/* ── Bandeau info ── */}
      <View style={styles.infoBanner}>
        <View style={styles.infoRow}>
          <Text style={styles.destinationName}>🏁 {destination.name || trip?.destination}</Text>
          {isNearDestination && (
            <TouchableOpacity style={styles.arrivedButton} onPress={handleArrived}>
              <Text style={styles.arrivedText}>✓ Arrivé</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Distance restante</Text>
            <Text style={styles.statValue}>{distanceKm} km</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Temps estimé</Text>
            <Text style={styles.statValue}>{estimatedTime || "---"}</Text>
          </View>
        </View>
      </View>

      {/* ── Carte ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        <Marker coordinate={driverLocation} rotation={heading} flat>
          <View style={styles.driverMarker}>
            <Text style={styles.driverIcon}>🚗</Text>
            <View style={styles.directionArrow} />
          </View>
        </Marker>

        <Marker coordinate={destination} pinColor="red">
          <View style={styles.destinationMarker}>
            <Text style={styles.destinationIcon}>🏁</Text>
          </View>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="#2563EB"
            lineDashPattern={isNearDestination ? [5, 5] : undefined}
          />
        )}
      </MapView>

      {/* ── Bouton retour ── */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Retour</Text>
      </TouchableOpacity>

      {/* ── Bouton recentrer ── */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={() => {
          if (mapRef.current && driverLocation) {
            mapRef.current.animateCamera({ center: driverLocation, pitch: 45, zoom: 17 });
          }
        }}
      >
        <Text style={styles.recenterText}>📍</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1a1a2e" },
  loadingText: { marginTop: 10, color: COLORS.textLight, fontSize: 16 },
  destinationText: { marginTop: 6, color: "#999", fontSize: 13 },
  infoBanner: {
    position: "absolute", top: 50, left: 16, right: 16,
    backgroundColor: "#fff", borderRadius: 16, padding: 14,
    zIndex: 10, elevation: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  destinationName: { fontSize: 16, fontWeight: "700", color: "#1F2937", flex: 1 },
  arrivedButton: { backgroundColor: COLORS.success, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  arrivedText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 10 },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { fontSize: 11, color: "#6B7280" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#2563EB", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#E5E7EB" },
  driverMarker: { alignItems: "center" },
  driverIcon: { fontSize: 32 },
  directionArrow: {
    width: 0, height: 0,
    borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10,
    borderLeftColor: "transparent", borderRightColor: "transparent",
    borderTopColor: "#2563EB", marginTop: -5,
  },
  destinationMarker: { alignItems: "center" },
  destinationIcon: { fontSize: 28 },
  backButton: {
    position: "absolute", top: 120, left: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, zIndex: 10,
  },
  backButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  recenterButton: {
    position: "absolute", bottom: 100, right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 44, height: 44, borderRadius: 22,
    justifyContent: "center", alignItems: "center", zIndex: 10,
  },
  recenterText: { fontSize: 24 },
});