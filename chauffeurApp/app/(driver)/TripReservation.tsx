import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

export default function TripReservationScreen() {

  const params = useLocalSearchParams();

  // ── Le trip est passé en JSON depuis TripScreen ──
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);

  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState<number | null>(null);

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

  // ── GPS chauffeur ──
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

          // ── Envoyer position au serveur ──
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

  // ── Destination depuis le trip passé en params ──
  // Au lieu d'appeler /api/trips/coords (inexistant),
  // on géocode la destination textuelle via Google Geocoding
  useEffect(() => {
    if (!trip?.destination) return;

    const geocodeDestination = async () => {
      try {
        const url =
          `https://maps.googleapis.com/maps/api/geocode/json?` +
          `address=${encodeURIComponent(trip.destination + ", Dakar, Sénégal")}` +
          `&key=${GOOGLE_MAPS_KEY}`;

        const res = await fetch(url);
        const json = await res.json();

        if (json.results?.length) {
          const loc = json.results[0].geometry.location;
          setDestination({
            latitude: loc.lat,
            longitude: loc.lng
          });
        } else {
          console.log("❌ Geocoding: aucun résultat pour", trip.destination);
        }
      } catch (e) {
        console.log("❌ GEOCODING ERROR", e);
      }
    };

    geocodeDestination();
  }, [trip]);

  // ── Calcul route Google Directions ──
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
        <Text style={{ marginTop: 10, color: "#555" }}>Chargement navigation...</Text>
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
        {/* Chauffeur */}
        <Marker coordinate={driverLocation} rotation={heading} flat>
          <Text style={{ fontSize: 28 }}>🚗</Text>
        </Marker>

        {/* Destination */}
        <Marker
          coordinate={destination}
          title={trip?.destination ?? "Destination"}
          pinColor="red"
        />

        {/* Itinéraire */}
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

// ── Décoder polyline Google ──
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
    alignItems: "center"
  }
});