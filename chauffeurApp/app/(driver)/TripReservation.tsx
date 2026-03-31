import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  Dimensions
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const { width } = Dimensions.get("window");

// ✅ Fonction de géocodage améliorée (identique à TripMap)
const geocodeDestination = async (destinationName: string): Promise<any> => {
  if (!destinationName) return null;

  const variations = [
    destinationName,
    `${destinationName}, Sénégal`,
    `${destinationName}, Dakar, Sénégal`,
    `${destinationName}, Thiès, Sénégal`,
    `${destinationName}, Mbour, Sénégal`,
  ];

  for (const query of variations) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_KEY}`;
      console.log(`🔍 Tentative geocoding (réservation): ${query}`);
      
      const res = await fetch(url);
      const json = await res.json();

      if (json.status === "OK" && json.results?.length > 0) {
        const loc = json.results[0].geometry.location;
        console.log(`✅ Trouvé pour ${query}`);
        return { latitude: loc.lat, longitude: loc.lng };
      }
    } catch (e) {
      console.log(`❌ Erreur geocoding pour ${query}:`, e);
    }
  }

  // Fallback pour Mbour et autres villes
  const fallbackCoords: { [key: string]: { lat: number; lng: number } } = {
    "mbour": { lat: 14.4056, lng: -16.9647 },
    "dakar": { lat: 14.6937, lng: -17.4441 },
    "thies": { lat: 14.7910, lng: -16.9259 },
    "touba": { lat: 14.8575, lng: -15.8766 },
    "saint louis": { lat: 16.0283, lng: -16.5000 },
    "kaolack": { lat: 14.1522, lng: -16.0727 },
    "ziguinchor": { lat: 12.5708, lng: -16.2694 },
    "diourbel": { lat: 14.6479, lng: -16.2438 },
  };

  const lowerName = destinationName.toLowerCase();
  for (const [city, coords] of Object.entries(fallbackCoords)) {
    if (lowerName.includes(city)) {
      console.log(`📍 Utilisation fallback pour ${city}`);
      return { latitude: coords.lat, longitude: coords.lng };
    }
  }

  return null;
};

export default function TripReservationScreen() {

  const params = useLocalSearchParams();
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);

  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [geocodingStatus, setGeocodingStatus] = useState<string>("Recherche de la destination...");

  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (stored) setDriverId(Number(stored));
    };
    load();
  }, []);

  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission GPS refusée");
        return;
      }

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 3000,
          distanceInterval: 5
        },
        loc => {
          const pos = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };

          setDriverLocation(pos);

          if (driverId) {
            fetch(`${API_URL}/api/driver/update_location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ driver_id: driverId, lat: pos.latitude, lng: pos.longitude })
            }).catch(() => {});
          }

          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: pos,
              heading,
              zoom: 17,
              pitch: 45
            });
          }
        }
      );
    })();

    return () => { if (sub) sub.remove(); };
  }, [heading, driverId]);

  // ✅ Géocodage amélioré
  useEffect(() => {
    if (!trip?.destination) return;

    const processGeocoding = async () => {
      setGeocodingStatus(`Localisation de "${trip.destination}"...`);
      const result = await geocodeDestination(trip.destination);
      if (result) {
        setDestination(result);
        setGeocodingStatus(`✅ Destination trouvée`);
      } else {
        setGeocodingStatus(`❌ Destination "${trip.destination}" non trouvée`);
        Alert.alert(
          "⚠️ Destination non trouvée",
          `La destination "${trip.destination}" n'a pas pu être localisée. Utilisez un nom plus précis (ex: Mbour, Sénégal).`
        );
      }
    };

    processGeocoding();
  }, [trip]);

  useEffect(() => {
    if (!driverLocation || !destination) return;

    const fetchRoute = async () => {
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
        } else {
          console.log("❌ Aucun itinéraire trouvé");
        }
      } catch (e) {
        console.log("❌ ROUTE ERROR", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [driverLocation, destination]);

  if (loading || !driverLocation || !destination) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#555" }}>{geocodingStatus}</Text>
        {trip?.destination && (
          <Text style={{ marginTop: 6, color: "#999", fontSize: 13 }}>
            Destination : {trip.destination}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={styles.map}
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
          coordinate={destination}
          title={trip?.destination ?? "Destination"}
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

function decodePolyline(encoded: string) {
  const points: any[] = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  }
});