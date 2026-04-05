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

// Types pour les coordonnées
interface Coordinates {
  latitude: number;
  longitude: number;
}

// Cache pour le géocoding et les routes
const geocodingCache: { [key: string]: Coordinates } = {};
const routesCache: { [key: string]: Coordinates[] } = {};

// Coordonnées des villes sénégalaises (fallback local)
const SENEGAL_CITIES: { [key: string]: Coordinates } = {
  dakar: { latitude: 14.6937, longitude: -17.4441 },
  thies: { latitude: 14.7910, longitude: -16.9259 },
  thiès: { latitude: 14.7910, longitude: -16.9259 },
  touba: { latitude: 14.8575, longitude: -15.8766 },
  mbour: { latitude: 14.4056, longitude: -16.9647 },
  "saint louis": { latitude: 16.0283, longitude: -16.5000 },
  kaolack: { latitude: 14.1522, longitude: -16.0727 },
  ziguinchor: { latitude: 12.5708, longitude: -16.2694 },
  diourbel: { latitude: 14.6479, longitude: -16.2438 },
};

export default function DriverTripMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;

  const mapRef = useRef<MapView | null>(null);
  const geocodingDone = useRef<boolean>(false);
  const watchPositionRef = useRef<Location.LocationSubscription | null>(null);

  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [endPoint, setEndPoint] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
  const [instruction, setInstruction] = useState("Démarrage navigation...");
  const [eta, setEta] = useState("");
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastSpoken, setLastSpoken] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

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
    const subscription = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => subscription.remove();
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

          // Envoyer la position au serveur
          if (driverId) {
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
  }, [heading, driverId]);

  // Fonction de géocoding avec API Google Maps en priorité
  const geocodeWithGoogle = async (destinationName: string): Promise<Coordinates | null> => {
    try {
      // Nettoyer le nom de la destination
      let searchName = destinationName;
      if (searchName.toLowerCase() === "thies") {
        searchName = "Thiès";
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchName + ", Sénégal")}&region=sn&language=fr&key=${GOOGLE_MAPS_KEY}`;
      
      console.log("🌐 Appel Google Geocoding API pour:", searchName);
      const response = await fetch(url);
      const json = await response.json();
      
      console.log("📊 Geocoding status:", json.status);
      
      if (json.status === "OK" && json.results && json.results.length > 0) {
        const loc = json.results[0].geometry.location;
        console.log("✅ Géocodage Google réussi:", json.results[0].formatted_address);
        return { latitude: loc.lat, longitude: loc.lng };
      }
      
      if (json.status === "REQUEST_DENIED") {
        console.error("❌ Clé API invalide ou quota dépassé");
      } else if (json.status === "ZERO_RESULTS") {
        console.log("⚠️ Aucun résultat pour:", destinationName);
      }
      
      return null;
    } catch (error) {
      console.log("❌ Erreur géocodage Google:", error);
      return null;
    }
  };

  // Fonction de fallback local
  const geocodeLocal = (destinationName: string): Coordinates | null => {
    const destName = destinationName.toLowerCase().trim();
    
    for (const [city, coords] of Object.entries(SENEGAL_CITIES)) {
      if (destName.includes(city) || city.includes(destName)) {
        console.log(`📍 Fallback local: ${city}`);
        return coords;
      }
    }
    return null;
  };

  // Géocoding de la destination
  useEffect(() => {
    if (!trip?.destination || geocodingDone.current) return;

    const getCoordinates = async () => {
      const destName = trip.destination;
      
      // Vérifier le cache
      if (geocodingCache[destName]) {
        console.log("✅ Cache trouvé pour:", destName);
        setEndPoint(geocodingCache[destName]);
        geocodingDone.current = true;
        setLoading(false);
        return;
      }

      // Priorité 1: API Google Maps
      let coords = await geocodeWithGoogle(destName);
      
      // Priorité 2: Fallback local
      if (!coords) {
        console.log("⚠️ Google échoue, utilisation du fallback local");
        coords = geocodeLocal(destName);
        if (coords) {
          setUsingFallback(true);
        }
      }
      
      // Priorité 3: Dakar par défaut
      if (!coords) {
        console.log("⚠️ Fallback ultime: Dakar");
        coords = { latitude: 14.6937, longitude: -17.4441 };
        setUsingFallback(true);
      }
      
      // Sauvegarder dans le cache
      geocodingCache[destName] = coords;
      setEndPoint(coords);
      geocodingDone.current = true;
      setLoading(false);
    };

    getCoordinates();
  }, [trip]);

  // Calcul de l'itinéraire avec Google Directions API
  const fetchRoute = async () => {
    if (!driverLocation || !endPoint) return;

    // Vérifier le cache
    const cacheKey = `${driverLocation.latitude},${driverLocation.longitude}-${endPoint.latitude},${endPoint.longitude}`;
    if (routesCache[cacheKey]) {
      console.log("✅ Route trouvée dans le cache");
      setRouteCoords(routesCache[cacheKey]);
      return;
    }

    try {
      console.log("🌐 Appel Google Directions API");
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${endPoint.latitude},${endPoint.longitude}&mode=driving&key=${GOOGLE_MAPS_KEY}&language=fr`;
      
      const response = await fetch(url);
      const json = await response.json();
      
      console.log("📊 Directions status:", json.status);
      
      if (json.status === "OK" && json.routes && json.routes.length > 0) {
        const route = json.routes[0];
        const leg = route.legs[0];
        
        // Décoder le polyline
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoords(points);
        
        // Sauvegarder dans le cache
        routesCache[cacheKey] = points;
        
        // Mettre à jour les informations ETA
        setEta(`${leg.duration.text} • ${leg.distance.text}`);
        
        // Instruction vocale
        const firstStep = leg.steps[0]?.html_instructions?.replace(/<[^>]+>/g, "");
        if (firstStep && firstStep !== lastSpoken) {
          setInstruction(firstStep);
          Speech.speak(firstStep, { language: "fr", rate: 0.9 });
          setLastSpoken(firstStep);
        } else if (!lastSpoken) {
          const startMsg = `Navigation vers ${trip?.destination}`;
          Speech.speak(startMsg, { language: "fr" });
          setLastSpoken(startMsg);
        }
        
        setLoading(false);
      } else if (json.status === "REQUEST_DENIED") {
        console.error("❌ Directions API: Clé invalide ou quota dépassé");
        setUsingFallback(true);
        calculateFallbackRoute();
      } else if (json.status === "ZERO_RESULTS") {
        console.log("⚠️ Aucun itinéraire trouvé");
        calculateFallbackRoute();
      }
    } catch (error) {
      console.log("❌ Erreur Directions API:", error);
      calculateFallbackRoute();
    }
  };

  // Calcul de route de fallback (ligne droite)
  const calculateFallbackRoute = () => {
    if (!driverLocation || !endPoint) return;
    
    console.log("📍 Utilisation du fallback (ligne droite)");
    setUsingFallback(true);
    
    const points: Coordinates[] = [];
    const steps = 30;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        latitude: driverLocation.latitude + (endPoint.latitude - driverLocation.latitude) * t,
        longitude: driverLocation.longitude + (endPoint.longitude - driverLocation.longitude) * t,
      });
    }
    
    setRouteCoords(points);
    
    // Calcul distance approximative
    const distance = calculateDistance(driverLocation, endPoint);
    const distanceKm = (distance / 1000).toFixed(1);
    const timeMinutes = Math.round(distance / 1000 / 60 * 60);
    const timeText = timeMinutes < 60 ? `${timeMinutes} min` : `${Math.floor(timeMinutes / 60)}h ${timeMinutes % 60}min`;
    
    setEta(`${distanceKm} km • ${timeText} (estimation)`);
    setInstruction(`Direction ${trip?.destination || "destination"}`);
    
    if (!lastSpoken) {
      Speech.speak(`Navigation vers ${trip?.destination || "destination"}`, { language: "fr" });
      setLastSpoken(trip?.destination || "destination");
    }
    
    setLoading(false);
  };

  // Calcul de distance (Haversine)
  const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
    const R = 6371e3;
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Décoder le polyline Google
  const decodePolyline = (encoded: string): Coordinates[] => {
    const points: Coordinates[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    
    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;
      
      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;
      
      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    
    return points;
  };

  // Recalculer la route quand la position change
  useEffect(() => {
    if (driverLocation && endPoint) {
      fetchRoute();
    }
  }, [driverLocation, endPoint]);

  // Vérifier si on est arrivé à destination
  const distanceToDestination = endPoint && driverLocation 
    ? calculateDistance(driverLocation, endPoint) 
    : Infinity;
  const isNearDestination = distanceToDestination < 100;

  if (loading || !driverLocation || !endPoint) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Navigation en cours...</Text>
        {trip?.destination && (
          <Text style={styles.destinationText}>
            Vers : {trip.destination}
          </Text>
        )}
        {usingFallback && (
          <Text style={styles.fallbackText}>
            ⚠️ Mode hors ligne - navigation approximative
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bandeau d'information */}
      <View style={styles.infoBanner}>
        <Text style={styles.instructionText}>🧭 {instruction}</Text>
        <Text style={styles.etaText}>⏱️ {eta}</Text>
        {usingFallback && (
          <Text style={styles.fallbackBanner}>⚠️ Mode approximatif</Text>
        )}
        {isNearDestination && (
          <TouchableOpacity style={styles.arrivedButton} onPress={() => router.back()}>
            <Text style={styles.arrivedText}>✓ Terminer la course</Text>
          </TouchableOpacity>
        )}
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
        <Marker coordinate={driverLocation} rotation={heading} flat>
          <View style={styles.driverMarker}>
            <Text style={styles.driverIcon}>🚗</Text>
          </View>
        </Marker>

        <Marker coordinate={endPoint} pinColor="red">
          <View style={styles.destinationMarker}>
            <Text style={styles.destinationIcon}>🏁</Text>
          </View>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="#2563EB"
            lineDashPattern={usingFallback ? [10, 10] : undefined}
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

// Styles
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
  fallbackText: {
    marginTop: 10,
    color: COLORS.warning,
    fontSize: 12,
  },
  infoBanner: {
    position: "absolute",
    top: 40,
    width: width - 20,
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    zIndex: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2563EB",
    textAlign: "center",
  },
  etaText: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  fallbackBanner: {
    fontSize: 11,
    color: COLORS.warning,
    textAlign: "center",
    marginTop: 6,
  },
  arrivedButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  arrivedText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  driverMarker: {
    alignItems: "center",
  },
  driverIcon: {
    fontSize: 32,
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