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

interface Coordinates {
  latitude: number;
  longitude: number;
}

const geocodingCache: { [key: string]: Coordinates } = {};
const routesCache: { [key: string]: Coordinates[] } = {};

export default function DriverTripMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);
  const watchPositionRef = useRef<Location.LocationSubscription | null>(null);

  // 🔒 anti-spam
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const lastPositionRef = useRef<Coordinates | null>(null);

  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [endPoint, setEndPoint] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧭 Boussole
  const [heading, setHeading] = useState(0);
  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  // 📍 GPS
  useEffect(() => {
    const start = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission GPS refusée");
        return;
      }

      watchPositionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const pos = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          // 🔒 ignore petits mouvements
          if (lastPositionRef.current) {
            const dist = calculateDistance(lastPositionRef.current, pos);
            if (dist < 30) return;
          }

          lastPositionRef.current = pos;
          setDriverLocation(pos);
        }
      );
    };

    start();
    return () => watchPositionRef.current?.remove();
  }, []);

  // 📍 Destination (simple fallback)
  useEffect(() => {
    if (!trip?.destination) return;

    // ici tu peux garder ton geocoding existant
    setEndPoint({ latitude: 14.6937, longitude: -17.4441 }); // test Dakar
    setLoading(false);
  }, [trip]);

  // 🗺️ ROUTE (ANTI-SPAM)
  const fetchRoute = async () => {
    if (!driverLocation || !endPoint) return;

    const now = Date.now();

    if (isFetchingRef.current || now - lastFetchTimeRef.current < 15000) {
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    const cacheKey = `${driverLocation.latitude},${driverLocation.longitude}-${endPoint.latitude},${endPoint.longitude}`;
    if (routesCache[cacheKey]) {
      setRouteCoords(routesCache[cacheKey]);
      isFetchingRef.current = false;
      return;
    }

    try {
      if (__DEV__) console.log("🌐 Directions API");

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${endPoint.latitude},${endPoint.longitude}&key=${GOOGLE_MAPS_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status !== "OK") {
        fallbackRoute();
        return;
      }

      const points = decodePolyline(json.routes[0].overview_polyline.points);
      routesCache[cacheKey] = points;
      setRouteCoords(points);

    } catch (e) {
      fallbackRoute();
    } finally {
      isFetchingRef.current = false;
    }
  };

  // 📍 fallback
  const fallbackRoute = () => {
    if (!driverLocation || !endPoint) return;

    const points: Coordinates[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      points.push({
        latitude: driverLocation.latitude + (endPoint.latitude - driverLocation.latitude) * t,
        longitude: driverLocation.longitude + (endPoint.longitude - driverLocation.longitude) * t,
      });
    }
    setRouteCoords(points);
  };

  // 🔁 recalcul contrôlé
  useEffect(() => {
    if (!driverLocation || !endPoint) return;

    fetchRoute();

  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    endPoint?.latitude,
    endPoint?.longitude
  ]);

  // 📐 distance
  const calculateDistance = (a: Coordinates, b: Coordinates) => {
    const R = 6371e3;
    const φ1 = a.latitude * Math.PI / 180;
    const φ2 = b.latitude * Math.PI / 180;
    const Δφ = (b.latitude - a.latitude) * Math.PI / 180;
    const Δλ = (b.longitude - a.longitude) * Math.PI / 180;

    const c = 2 * Math.atan2(
      Math.sqrt(Math.sin(Δφ / 2) ** 2 +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2),
      Math.sqrt(1 - Math.sin(Δφ / 2) ** 2)
    );

    return R * c;
  };

  const decodePolyline = (encoded: string): Coordinates[] => {
    let points: Coordinates[] = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      lat += (result & 1) ? ~(result >> 1) : (result >> 1);

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      lng += (result & 1) ? ~(result >> 1) : (result >> 1);

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  if (loading || !driverLocation || !endPoint) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: "#fff" }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={driverLocation} />
        <Marker coordinate={endPoint} />

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="blue" />
        )}
      </MapView>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={{ color: "#fff" }}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "black",
    padding: 10,
    borderRadius: 10,
  },
});