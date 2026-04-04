import React, { useEffect, useState, useRef, useCallback } from "react";
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
const { width, height } = Dimensions.get("window");

// ============================================================
// DONNÉES STATIQUES - COORDONNÉES DES VILLES SÉNÉGALAISES
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

// Routes approximatives (prédéfinies pour les trajets courants)
const PREDEFINED_ROUTES: { [key: string]: Array<{ lat: number; lng: number }> } = {
  "dakar-thies": [
    { lat: 14.6937, lng: -17.4441 },
    { lat: 14.7230, lng: -17.3500 },
    { lat: 14.7500, lng: -17.2500 },
    { lat: 14.7700, lng: -17.1500 },
    { lat: 14.7800, lng: -17.0500 },
    { lat: 14.7910, lng: -16.9259 },
  ],
  "dakar-touba": [
    { lat: 14.6937, lng: -17.4441 },
    { lat: 14.7500, lng: -17.3000 },
    { lat: 14.8000, lng: -17.1500 },
    { lat: 14.8500, lng: -17.0000 },
    { lat: 14.8575, lng: -15.8766 },
  ],
  "dakar-mbour": [
    { lat: 14.6937, lng: -17.4441 },
    { lat: 14.6500, lng: -17.4000 },
    { lat: 14.5500, lng: -17.3000 },
    { lat: 14.4500, lng: -17.2000 },
    { lat: 14.4056, lng: -16.9647 },
  ],
  "dakar-saintlouis": [
    { lat: 14.6937, lng: -17.4441 },
    { lat: 14.8000, lng: -17.3000 },
    { lat: 15.0000, lng: -17.0000 },
    { lat: 15.5000, lng: -16.8000 },
    { lat: 16.0283, lng: -16.5000 },
  ],
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

// Calculer la distance entre deux points (formule de Haversine)
function distanceBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Obtenir les coordonnées d'une ville (fallback local uniquement)
function getCityCoordinates(cityName: string): { lat: number; lng: number; name: string } | null {
  const normalized = cityName.toLowerCase().trim();
  
  // Recherche exacte
  if (SENEGAL_CITIES[normalized]) {
    return SENEGAL_CITIES[normalized];
  }
  
  // Recherche partielle
  for (const [key, value] of Object.entries(SENEGAL_CITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

// Obtenir une route prédéfinie
function getPredefinedRoute(from: string, to: string): Array<{ lat: number; lng: number }> | null {
  const key1 = `${from.toLowerCase()}-${to.toLowerCase()}`;
  const key2 = `${to.toLowerCase()}-${from.toLowerCase()}`;
  
  if (PREDEFINED_ROUTES[key1]) {
    return PREDEFINED_ROUTES[key1];
  }
  if (PREDEFINED_ROUTES[key2]) {
    return [...PREDEFINED_ROUTES[key2]].reverse();
  }
  return null;
}

// Générer une route simple entre deux points (ligne droite)
function generateSimpleRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Array<{ lat: number; lng: number }> {
  const points = [];
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push({
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
    });
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
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [remainingDistance, setRemainingDistance] = useState<number>(0);
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

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
    let subscription: any;
    
    const startMagnetometer = async () => {
      const { status } = await Magnetometer.requestPermissionsAsync();
      if (status === "granted") {
        subscription = Magnetometer.addListener(data => {
          let angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
          angle = angle >= 0 ? angle : angle + 360;
          setHeading(angle);
        });
      }
    };
    
    startMagnetometer();
    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // GPS Chauffeur
  useEffect(() => {
    const startWatching = async () => {
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
        async (location) => {
          const pos = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setDriverLocation(pos);

          // Mettre à jour la distance restante
          if (destination) {
            const dist = distanceBetween(
              pos.latitude, pos.longitude,
              destination.latitude, destination.longitude
            );
            setRemainingDistance(dist);
            
            // Estimer le temps restant (vitesse moyenne 60 km/h)
            const timeMinutes = (dist / 1000) / 60 * 60; // 60 km/h
            if (timeMinutes < 60) {
              setEstimatedTime(`${Math.round(timeMinutes)} min`);
            } else {
              const hours = Math.floor(timeMinutes / 60);
              const minutes = Math.round(timeMinutes % 60);
              setEstimatedTime(`${hours}h ${minutes}min`);
            }
          }

          // Centrer la carte sur le chauffeur
          if (mapRef.current && isNavigating) {
            mapRef.current.animateCamera({
              center: pos,
              pitch: 45,
              heading: heading,
              zoom: 17,
            });
          }
        }
      );
    };

    startWatching();

    return () => {
      if (watchPositionRef.current) {
        watchPositionRef.current.remove();
      }
    };
  }, [destination, heading, isNavigating]);

  // Initialiser la destination
  useEffect(() => {
    if (!trip?.destination) {
      setLoading(false);
      return;
    }

    const initializeDestination = () => {
      // Chercher les coordonnées de la destination
      const cityCoords = getCityCoordinates(trip.destination);
      
      if (cityCoords) {
        console.log("📍 Destination trouvée:", cityCoords.name, cityCoords);
        setDestination({
          latitude: cityCoords.lat,
          longitude: cityCoords.lng,
          name: cityCoords.name,
        });
      } else {
        // Fallback: Dakar
        console.log("⚠️ Destination non trouvée, fallback sur Dakar");
        setDestination({
          latitude: 14.6937,
          longitude: -17.4441,
          name: "Dakar",
        });
      }
      setLoading(false);
    };

    initializeDestination();
  }, [trip]);

  // Calculer l'itinéraire
  useEffect(() => {
    if (!driverLocation || !destination) return;

    const calculateRoute = () => {
      const from = trip?.depart || "dakar";
      const to = trip?.destination || "dakar";
      
      // Essayer d'utiliser une route prédéfinie
      let route = getPredefinedRoute(from, to);
      
      if (!route) {
        // Générer une route simple
        route = generateSimpleRoute(
          { lat: driverLocation.latitude, lng: driverLocation.longitude },
          { lat: destination.latitude, lng: destination.longitude }
        );
      } else {
        // Ajuster le point de départ à la position actuelle
        const firstPoint = route[0];
        const distanceToStart = distanceBetween(
          driverLocation.latitude, driverLocation.longitude,
          firstPoint.lat, firstPoint.lng
        );
        
        if (distanceToStart > 1000) {
          // Si trop loin, recalculer avec position actuelle
          route = generateSimpleRoute(
            { lat: driverLocation.latitude, lng: driverLocation.longitude },
            { lat: destination.latitude, lng: destination.longitude }
          );
        }
      }
      
      setRouteCoords(route);
      
      // Calculer la distance restante
      const dist = distanceBetween(
        driverLocation.latitude, driverLocation.longitude,
        destination.latitude, destination.longitude
      );
      setRemainingDistance(dist);
      
      const timeMinutes = (dist / 1000) / 60 * 60;
      if (timeMinutes < 60) {
        setEstimatedTime(`${Math.round(timeMinutes)} min`);
      } else {
        const hours = Math.floor(timeMinutes / 60);
        const minutes = Math.round(timeMinutes % 60);
        setEstimatedTime(`${hours}h ${minutes}min`);
      }
    };

    calculateRoute();
    setIsNavigating(true);
  }, [driverLocation, destination, trip]);

  // Recalculer la route si déviation > 100m
  useEffect(() => {
    if (!driverLocation || routeCoords.length === 0) return;

    let minDistance = Infinity;
    routeCoords.forEach(point => {
      const dist = distanceBetween(
        driverLocation.latitude, driverLocation.longitude,
        point.lat, point.lng
      );
      if (dist < minDistance) minDistance = dist;
    });

    if (minDistance > 100 && destination) {
      // Recalculer la route
      const newRoute = generateSimpleRoute(
        { lat: driverLocation.latitude, lng: driverLocation.longitude },
        { lat: destination.latitude, lng: destination.longitude }
      );
      setRouteCoords(newRoute);
    }
  }, [driverLocation, routeCoords, destination]);

  // Speech pour les instructions
  useEffect(() => {
    if (isNavigating && remainingDistance > 0) {
      const distanceKm = (remainingDistance / 1000).toFixed(1);
      if (remainingDistance < 100) {
        Speech.speak("Vous êtes arrivé à destination", { language: "fr" });
      } else if (remainingDistance < 500) {
        Speech.speak("Dans 500 mètres, vous arrivez à destination", { language: "fr" });
      } else if (Math.floor(remainingDistance / 1000) !== Math.floor((remainingDistance + 1000) / 1000)) {
        Speech.speak(`Encore ${distanceKm} kilomètres`, { language: "fr" });
      }
    }
  }, [remainingDistance, isNavigating]);

  // Arriver à destination
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
          <Text style={styles.destinationText}>
            Vers : {trip.destination}
          </Text>
        )}
      </View>
    );
  }

  const distanceKm = (remainingDistance / 1000).toFixed(1);
  const isNearDestination = remainingDistance < 100;

  return (
    <View style={styles.container}>
      {/* Bandeau d'information */}
      <View style={styles.infoBanner}>
        <View style={styles.infoRow}>
          <Text style={styles.destinationName}>
            🏁 {destination.name || trip?.destination}
          </Text>
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

      {/* Carte */}
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
        {/* Marqueur du chauffeur */}
        <Marker coordinate={driverLocation} rotation={heading} flat>
          <View style={styles.driverMarker}>
            <Text style={styles.driverIcon}>🚗</Text>
            <View style={styles.directionArrow} />
          </View>
        </Marker>

        {/* Marqueur de destination */}
        <Marker coordinate={destination} pinColor="red">
          <View style={styles.destinationMarker}>
            <Text style={styles.destinationIcon}>🏁</Text>
          </View>
        </Marker>

        {/* Ligne d'itinéraire */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="#2563EB"
            lineDashPattern={isNearDestination ? [5, 5] : undefined}
          />
        )}
      </MapView>

      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Retour</Text>
      </TouchableOpacity>

      {/* Bouton recentrer */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={() => {
          if (mapRef.current && driverLocation) {
            mapRef.current.animateCamera({
              center: driverLocation,
              pitch: 45,
              zoom: 17,
            });
          }
        }}
      >
        <Text style={styles.recenterText}>📍</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
    fontSize: 16,
  },
  destinationText: {
    marginTop: 6,
    color: "#999",
    fontSize: 13,
  },
  infoBanner: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  arrivedButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  arrivedText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
  driverMarker: {
    alignItems: "center",
  },
  driverIcon: {
    fontSize: 32,
  },
  directionArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#2563EB",
    marginTop: -5,
  },
  destinationMarker: {
    alignItems: "center",
  },
  destinationIcon: {
    fontSize: 28,
  },
  backButton: {
    position: "absolute",
    top: 120,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  recenterButton: {
    position: "absolute",
    bottom: 100,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  recenterText: {
    fontSize: 24,
  },
});