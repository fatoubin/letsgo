import React, { useEffect, useState, useRef } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Dimensions, Alert } from "react-native";
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
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Lire driverId
  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (stored) setDriverId(Number(stored));
    };
    load();
  }, []);

  // Boussole
  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  // GPS Chauffeur
  useEffect(() => {
    let sub: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission GPS refusée");
        return;
      }

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 3000, distanceInterval: 5 },
        async loc => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setDriverLocation(pos);

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

  // ✅ Fonction améliorée pour géocoder la destination
  const geocodeDestination = async (destinationName: string) => {
    if (!destinationName) return null;

    setGeocodingError(null);

    // Liste des variations possibles pour chaque destination
    const variations = [
      destinationName,
      `${destinationName}, Sénégal`,
      `${destinationName}, Dakar, Sénégal`,
      `${destinationName}, Thiès, Sénégal`,
      `${destinationName}, Mbour, Sénégal`,
      `${destinationName}, Région de Thiès`,
      `${destinationName}, Région de Dakar`,
    ];

    // Essayer différentes variations
    for (const query of variations) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
        console.log(`🔍 Tentative geocoding: ${query}`);
        
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === "OK" && json.results?.length > 0) {
          const loc = json.results[0].geometry.location;
          const formattedAddress = json.results[0].formatted_address;
          console.log(`✅ Trouvé: ${formattedAddress} pour ${query}`);
          return { latitude: loc.lat, longitude: loc.lng, formattedAddress };
        }
      } catch (e) {
        console.log(`❌ Erreur geocoding pour ${query}:`, e);
      }
    }

    // Si toujours pas trouvé, essayer avec un fallback
    console.log(`⚠️ Aucun résultat pour ${destinationName}, tentative avec fallback...`);
    
    // Fallback: coordonnées approximatives pour les villes principales du Sénégal
    const fallbackCoords: { [key: string]: { lat: number; lng: number } } = {
      "dakar": { lat: 14.6937, lng: -17.4441 },
      "thies": { lat: 14.7910, lng: -16.9259 },
      "touba": { lat: 14.8575, lng: -15.8766 },
      "mbour": { lat: 14.4056, lng: -16.9647 },
      "saint louis": { lat: 16.0283, lng: -16.5000 },
      "kaolack": { lat: 14.1522, lng: -16.0727 },
      "ziguinchor": { lat: 12.5708, lng: -16.2694 },
      "diourbel": { lat: 14.6479, lng: -16.2438 },
      "louga": { lat: 15.6187, lng: -16.2287 },
      "tambacounda": { lat: 13.7716, lng: -13.6673 },
      "kolda": { lat: 12.8943, lng: -14.9444 },
      "matam": { lat: 15.6585, lng: -13.2500 },
      "kedougou": { lat: 12.5520, lng: -12.1807 },
      "sedhiou": { lat: 12.7078, lng: -15.5569 },
    };

    const lowerName = destinationName.toLowerCase();
    for (const [city, coords] of Object.entries(fallbackCoords)) {
      if (lowerName.includes(city)) {
        console.log(`📍 Utilisation des coordonnées de fallback pour ${city}`);
        setGeocodingError(`Attention: Utilisation des coordonnées approximatives pour ${destinationName}`);
        return { latitude: coords.lat, longitude: coords.lng, formattedAddress: destinationName };
      }
    }

    setGeocodingError(`❌ Impossible de localiser "${destinationName}". Vérifiez le nom et réessayez.`);
    return null;
  };

  // Géocoder la destination
  useEffect(() => {
    if (!trip?.destination) return;

    const processGeocoding = async () => {
      try {
        const result = await geocodeDestination(trip.destination);
        if (result) {
          setEndPoint(result);
        } else {
          Alert.alert(
            "⚠️ Destination non trouvée",
            `La destination "${trip.destination}" n'a pas pu être localisée. Vérifiez le nom ou ajoutez des coordonnées précises.`,
            [{ text: "OK" }]
          );
        }
      } catch (e) {
        console.log("❌ GEOCODING ERROR", e);
        Alert.alert("Erreur", "Impossible de localiser la destination");
      }
    };

    processGeocoding();
  }, [trip]);

  // Calcul route
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

      if (!json.routes?.length) {
        console.log("❌ Aucun itinéraire trouvé");
        return;
      }

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

  if (loading || !driverLocation || !endPoint) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#555" }}>
          {geocodingError ? "Recherche alternative..." : "Navigation en cours..."}
        </Text>
        {geocodingError && (
          <Text style={{ marginTop: 10, color: "#FF6B6B", fontSize: 12, textAlign: "center", paddingHorizontal: 20 }}>
            {geocodingError}
          </Text>
        )}
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
        {endPoint?.formattedAddress && (
          <Text style={styles.destinationText}>📍 {endPoint.formattedAddress}</Text>
        )}
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

function distanceBetween(a: any, b: any) {
  const R = 6371e3;
  const φ1 = a.latitude * Math.PI / 180;
  const φ2 = b.latitude * Math.PI / 180;
  const Δφ = (b.latitude - a.latitude) * Math.PI / 180;
  const Δλ = (b.longitude - a.longitude) * Math.PI / 180;
  const x = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
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
  etaText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 4 },
  destinationText: { fontSize: 11, color: "#6B7280", textAlign: "center", marginTop: 6 }
});

const nightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1f2933" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9CA3AF" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] }
];