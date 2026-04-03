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

// ── Throttle : envoyer position max 1 fois toutes les 10 secondes ──
let lastLocationSent = 0;

export default function DriverTripMapScreen() {

  const params = useLocalSearchParams();
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
        {
          accuracy: Location.Accuracy.Balanced, // ← Balanced au lieu de Highest (moins de batterie)
          timeInterval: 5000,                   // ← 5s au lieu de 3s
          distanceInterval: 10                  // ← 10m au lieu de 5m
        },
        async loc => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setDriverLocation(pos);

          // ── Throttle : envoyer position max 1 fois toutes les 10s ──
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

          if (mapRef.current) {
            mapRef.current.animateCamera({ center: pos, pitch: 60, heading, zoom: 18 });
          }
        }
      );
    })();

    return () => { if (sub) sub.remove(); };
  }, [heading, driverId]);

  // ── Geocoder la destination avec fallback ──
  useEffect(() => {
    if (!trip?.destination) return;

    const geocodeDestination = async () => {
      try {
        // Essayer plusieurs formats
        const queries = [
          `${trip.destination}, Sénégal`,
          `${trip.destination}, Senegal`,
          `${trip.destination}`,
        ];

        let found = false;

        for (const query of queries) {
          const url =
            `https://maps.googleapis.com/maps/api/geocode/json?` +
            `address=${encodeURIComponent(query)}` +
            `&region=sn` +
            `&language=fr` +
            `&key=${GOOGLE_MAPS_KEY}`;

          const res = await fetch(url);
          const json = await res.json();

          console.log("🔍 Geocoding:", query, "| status:", json.status);

          if (json.results?.length) {
            const loc = json.results[0].geometry.location;
            setEndPoint({ latitude: loc.lat, longitude: loc.lng });
            found = true;
            break;
          }
        }

        if (!found) {
          console.log("❌ Aucun résultat pour:", trip.destination);
          // Fallback : Dakar centre
          setEndPoint({ latitude: 14.6928, longitude: -17.4467 });
          setLoading(false);
        }

      } catch (e) {
        console.log("❌ GEOCODING ERROR", e);
        setEndPoint({ latitude: 14.6928, longitude: -17.4467 });
        setLoading(false);
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

  // ── Recalcul si sortie de route (> 80m) ──
  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return;

    let minDistance = Infinity;
    routeCoords.forEach(p => {
      const d = distanceBetween(driverLocation, p);
      if (d < minDistance) minDistance = d;
    });

    if (minDistance > 80) fetchRoute(); // 80m au lieu de 60m
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

        <Marker coordinate={endPoint} title={trip?.destination ?? "Arrivée"} pinColor="red" />

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={6} strokeColor="#2563EB" />
        )}
      </MapView>

    </View>
  );
}

function distanceBetween(a: any, b: any) {
  const R = 6371e3;
  const φ1 = a.latitude * Math.PI / 180;
  const φ2 = b.latitude * Math.PI / 180;
  const Δφ = (b.latitude - a.latitude) * Math.PI / 180;
  const Δλ = (b.longitude - a.longitude) * Math.PI / 180;
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

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