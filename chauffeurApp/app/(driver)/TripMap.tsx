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

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "";
const { width } = Dimensions.get("window");

interface Coordinates {
  latitude: number;
  longitude: number;
}

const routesCache: { [key: string]: Coordinates[] } = {};

export default function DriverTripMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<any>(null);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [endPoint, setEndPoint] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
  const [navigationActive, setNavigationActive] = useState(false);
  const [eta, setEta] = useState("");
  const [distance, setDistance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [heading, setHeading] = useState(0);

  // 🧭 Boussole
  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  // 📍 GPS initial
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setDriverLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // 📍 Géocodage simple (fallback Dakar si inconnu)
  useEffect(() => {
    if (!trip?.destination) return;

    // simplifié pour éviter API payante
    setEndPoint({
      latitude: 14.6937,
      longitude: -17.4441,
    });

    setLoading(false);
  }, [trip]);

  // ===============================
  // 🔥 ROUTE MAPBOX + OSRM
  // ===============================
  const fetchRoute = async () => {
    if (!driverLocation || !endPoint) return;

    const now = Date.now();
    if (isFetchingRef.current || now - lastFetchTimeRef.current < 8000) return;

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    const key = `${driverLocation.latitude}-${driverLocation.longitude}-${endPoint.latitude}-${endPoint.longitude}`;

    if (routesCache[key]) {
      setRouteCoords(routesCache[key]);
      isFetchingRef.current = false;
      return;
    }

    try {
      // MAPBOX
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.longitude},${driverLocation.latitude};${endPoint.longitude},${endPoint.latitude}?geometries=polyline&overview=full&access_token=${MAPBOX_TOKEN}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.routes?.length) {
        const route = json.routes[0];

        const coords = decodePolyline(route.geometry);
        routesCache[key] = coords;

        setRouteCoords(coords);
        setEta(`${Math.round(route.duration / 60)} min`);
        setDistance(route.distance);

        return;
      }

      throw new Error("Mapbox fail");

    } catch (e) {
      try {
        // OSRM
        const url = `https://router.project-osrm.org/route/v1/driving/${driverLocation.longitude},${driverLocation.latitude};${endPoint.longitude},${endPoint.latitude}?overview=full&geometries=polyline`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.routes?.length) {
          const route = json.routes[0];

          const coords = decodePolyline(route.geometry);
          routesCache[key] = coords;

          setRouteCoords(coords);
          setEta(`${Math.round(route.duration / 60)} min`);
          setDistance(route.distance);

          return;
        }

        throw new Error("OSRM fail");

      } catch {
        fallbackRoute();
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  // fallback ligne droite
  const fallbackRoute = () => {
    if (!driverLocation || !endPoint) return;

    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      pts.push({
        latitude: driverLocation.latitude + (endPoint.latitude - driverLocation.latitude) * t,
        longitude: driverLocation.longitude + (endPoint.longitude - driverLocation.longitude) * t,
      });
    }
    setRouteCoords(pts);
  };

  // polyline decode
  const decodePolyline = (str: string) => {
    let index = 0, lat = 0, lng = 0, coords = [];

    while (index < str.length) {
      let b, shift = 0, result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);

      shift = 0;
      result = 0;
      do {
        b = str.charCodeAt(index++) - 63;
        result |= (b & 31) << shift;
        shift += 5;
      } while (b >= 32);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);

      coords.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return coords;
  };

  const lastRouteFetchRef = useRef(0);

  useEffect(() => {
    if (driverLocation && endPoint) fetchRoute();
  }, [driverLocation, endPoint]);

  if (loading || !driverLocation || !endPoint) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          ...driverLocation,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={driverLocation} rotation={heading} />
        <Marker coordinate={endPoint} pinColor="red" />

        {routeCoords.length > 0 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} />
        )}
      </MapView>

      <View style={styles.info}>
        <Text>{trip?.destination}</Text>
        <Text>{(distance / 1000).toFixed(1)} km</Text>
        <Text>{eta}</Text>
      </View>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          setNavigationActive(true);
          fetchRoute();
          Speech.speak("Navigation démarrée", { language: "fr" });
        }}
      >
        <Text style={{ color: "#fff" }}>Démarrer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  info: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
  },
  btn: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "green",
    padding: 15,
    alignItems: "center",
    borderRadius: 30,
  },
});