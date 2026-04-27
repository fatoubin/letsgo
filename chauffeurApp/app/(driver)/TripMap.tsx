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

interface RouteInfo {
  duration: string;
  distance: string;
  steps: any[];
}

const geocodingCache: { [key: string]: Coordinates } = {};
const routesCache: { [key: string]: Coordinates[] } = {};

// Coordonnées des villes sénégalaises (fallback)
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
  const watchPositionRef = useRef<Location.LocationSubscription | null>(null);
  const lastLocationSentRef = useRef<number>(0);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const navigationStartedRef = useRef(false);

  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<Coordinates | null>(null);
  const [endPoint, setEndPoint] = useState<Coordinates | null>(null);
  const [routeCoords, setRouteCoords] = useState<Coordinates[]>([]);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [navigationActive, setNavigationActive] = useState(false);
  const [eta, setEta] = useState("");
  const [remainingDistance, setRemainingDistance] = useState(0);
  const [tripCompleted, setTripCompleted] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState("");

  // 🧭 Boussole
  const [heading, setHeading] = useState(0);
  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  // 📍 Récupérer driverId
  useEffect(() => {
    const loadDriverId = async () => {
      try {
        const stored = await SecureStore.getItemAsync("driverId");
        console.log("📱 DriverId récupéré:", stored);
        if (stored) {
          setDriverId(Number(stored));
        } else {
          console.log("⚠️ Aucun driverId trouvé dans SecureStore");
        }
      } catch (error) {
        console.log("❌ Erreur lecture driverId:", error);
      }
    };
    loadDriverId();
  }, []);

  // 📍 Récupérer la position GPS initiale
  useEffect(() => {
    const getInitialLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission GPS refusée");
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const pos = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      console.log("📍 Position initiale:", pos);
      setDriverLocation(pos);
    };
    
    getInitialLocation();
  }, []);

  // 🗺️ Géocoder la destination
  useEffect(() => {
    if (!trip?.destination) {
      console.log("⚠️ Pas de destination dans le trip");
      return;
    }

    const geocodeDestination = async () => {
      try {
        setGeocodingStatus(`Recherche de ${trip.destination}...`);
        const destName = trip.destination.toLowerCase().trim();
        
        // Vérifier le cache
        if (geocodingCache[destName]) {
          console.log("✅ Destination trouvée dans le cache:", geocodingCache[destName]);
          setEndPoint(geocodingCache[destName]);
          setGeocodingStatus("");
          setLoading(false);
          return;
        }

        // Chercher dans les villes sénégalaises
        let found = false;
        for (const [city, coords] of Object.entries(SENEGAL_CITIES)) {
          if (destName.includes(city) || city.includes(destName)) {
            console.log(`✅ Destination trouvée dans la base locale: ${city}`);
            geocodingCache[destName] = coords;
            setEndPoint(coords);
            found = true;
            setGeocodingStatus("");
            setLoading(false);
            break;
          }
        }

        if (!found && GOOGLE_MAPS_KEY) {
          // Tentative avec Google Maps API
          setGeocodingStatus(`Recherche sur Google Maps...`);
          let searchName = trip.destination;
          if (searchName.toLowerCase() === "thies") searchName = "Thiès";
          
          const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchName + ", Sénégal")}&region=sn&key=${GOOGLE_MAPS_KEY}`;
          console.log("🌐 Appel Google Geocoding:", url);
          
          const res = await fetch(url);
          const json = await res.json();
          
          if (json.status === "OK" && json.results?.length) {
            const loc = json.results[0].geometry.location;
            const coords = { latitude: loc.lat, longitude: loc.lng };
            console.log("✅ Géocodage Google réussi:", coords);
            geocodingCache[destName] = coords;
            setEndPoint(coords);
            setGeocodingStatus("");
          } else {
            console.log("❌ Google Geocoding échec:", json.status);
            // Fallback Dakar
            const fallback = { latitude: 14.6937, longitude: -17.4441 };
            geocodingCache[destName] = fallback;
            setEndPoint(fallback);
            setGeocodingStatus(`⚠️ Destination approximative: ${trip.destination}`);
          }
        } else if (!found) {
          // Fallback Dakar
          const fallback = { latitude: 14.6937, longitude: -17.4441 };
          geocodingCache[destName] = fallback;
          setEndPoint(fallback);
          setGeocodingStatus(`⚠️ Destination approximative: ${trip.destination}`);
        }
      } catch (e) {
        console.log("❌ Erreur géocodage:", e);
        setEndPoint({ latitude: 14.6937, longitude: -17.4441 });
        setGeocodingStatus("Erreur de localisation");
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    };

    geocodeDestination();
  }, [trip]);

  // 🗺️ Calcul de l'itinéraire (Google Directions API)
  const fetchRoute = async () => {
    if (!driverLocation || !endPoint) {
      console.log("⚠️ Pas de position ou destination pour fetchRoute");
      return;
    }

    const now = Date.now();
    if (isFetchingRef.current || now - lastFetchTimeRef.current < 10000) {
      console.log("⏳ Route en cours de calcul ou trop récente");
      return;
    }

    isFetchingRef.current = true;
    lastFetchTimeRef.current = now;

    const cacheKey = `${driverLocation.latitude.toFixed(4)},${driverLocation.longitude.toFixed(4)}-${endPoint.latitude.toFixed(4)},${endPoint.longitude.toFixed(4)}`;
    if (routesCache[cacheKey]) {
      console.log("✅ Route trouvée dans le cache");
      setRouteCoords(routesCache[cacheKey]);
      isFetchingRef.current = false;
      return;
    }

    try {
      console.log("🌐 Appel Directions API...");
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${endPoint.latitude},${endPoint.longitude}&mode=driving&key=${GOOGLE_MAPS_KEY}&language=fr`;
      
      const res = await fetch(url);
      const json = await res.json();

      if (json.status === "OK" && json.routes?.length) {
        const route = json.routes[0];
        const leg = route.legs[0];
        
        const points = decodePolyline(route.overview_polyline.points);
        routesCache[cacheKey] = points;
        setRouteCoords(points);
        
        setRouteInfo({
          duration: leg.duration.text,
          distance: leg.distance.text,
          steps: leg.steps,
        });
        
        setEta(`${leg.duration.text} • ${leg.distance.text}`);
        
        const dist = calculateDistance(driverLocation, endPoint);
        setRemainingDistance(dist);
        console.log("✅ Itinéraire calculé:", leg.distance.text, leg.duration.text);
      } else {
        console.log("❌ Directions API échec:", json.status);
        fallbackRoute();
      }
    } catch (e) {
      console.log("❌ Directions API error:", e);
      fallbackRoute();
    } finally {
      isFetchingRef.current = false;
    }
  };

  // Fallback ligne droite
  const fallbackRoute = () => {
    if (!driverLocation || !endPoint) return;
    console.log("📍 Utilisation du fallback ligne droite");
    const points: Coordinates[] = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      points.push({
        latitude: driverLocation.latitude + (endPoint.latitude - driverLocation.latitude) * t,
        longitude: driverLocation.longitude + (endPoint.longitude - driverLocation.longitude) * t,
      });
    }
    setRouteCoords(points);
    const dist = calculateDistance(driverLocation, endPoint);
    setRemainingDistance(dist);
    setEta(`${(dist / 1000).toFixed(1)} km (estimation)`);
  };

  // Calculer l'itinéraire quand les positions sont disponibles
  useEffect(() => {
    if (driverLocation && endPoint && !loading) {
      console.log("🔄 Calcul de l'itinéraire...");
      fetchRoute();
    }
  }, [driverLocation, endPoint, loading]);

  // 📍 GPS (uniquement si navigation active)
useEffect(() => {
  if (!navigationActive) return;

  const startWatching = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Erreur", "Permission GPS refusée");
      return;
    }

    watchPositionRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 10,
      },
      async (location) => {
        const pos = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setDriverLocation(pos);

        // Calculer la distance restante
        if (endPoint) {
          const distanceToDestination = calculateDistance(pos, endPoint);
          setRemainingDistance(distanceToDestination);
          
          const timeMin = Math.round(distanceToDestination / 1000 / 60 * 60);
          setEta(timeMin < 60 ? `${timeMin} min` : `${Math.floor(timeMin / 60)}h ${timeMin % 60}min`);

          // Vérifier arrivée
          if (distanceToDestination < 100 && !tripCompleted) {
            handleArriveAtDestination();
          }
        }

        // Envoyer position au serveur
        const now = Date.now();
        if (driverId && now - lastLocationSentRef.current >= 4000) {
          lastLocationSentRef.current = now;
          try {
            const token = await SecureStore.getItemAsync("token");
            await fetch(`${API_URL}/api/driver/update_location`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                driver_id: driverId,
                lat: pos.latitude,
                lng: pos.longitude,
              }),
            });
          } catch (error) {
            console.log("❌ Erreur envoi position:", error);
          }
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
}, [navigationActive, driverId, endPoint]);

  // Démarrage de la navigation
  const startNavigation = () => {
    if (!driverLocation || !endPoint) {
      Alert.alert("Erreur", "Position ou destination non disponible");
      return;
    }
    console.log("🚀 Démarrage navigation");
    setNavigationActive(true);
    navigationStartedRef.current = true;
    fetchRoute();
    Speech.speak(`Navigation vers ${trip?.destination} démarrée`, { language: "fr" });
  };

  // Arrivée à destination
  const handleArriveAtDestination = () => {
    if (tripCompleted) return;
    setTripCompleted(true);
    setNavigationActive(false);
    
    Speech.speak("Vous êtes arrivé à destination. Terminez la course.", { language: "fr" });
    
    Alert.alert(
      "Arrivée à destination",
      "Vous êtes arrivé. Souhaitez-vous terminer la course ?",
      [
        { text: "Continuer", style: "cancel", onPress: () => {
            setNavigationActive(true);
            setTripCompleted(false);
          }
        },
        {
          text: "Terminer la course",
          onPress: () => completeTrip()
        }
      ]
    );
  };

  // Terminer le trajet
  const completeTrip = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      
      await fetch(`${API_URL}/api/trips/complete/${trip?.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      
      Alert.alert(
        "Course terminée",
        "Le client a été redirigé vers la page de paiement.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.log("❌ Erreur fin course:", error);
      Alert.alert("Succès", "Course terminée avec succès", [
        { text: "OK", onPress: () => router.back() }
      ]);
    }
  };

  // Calcul de distance (Haversine)
  const calculateDistance = (point1: Coordinates, point2: Coordinates): number => {
    const R = 6371e3;
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Décodage polyline
  const decodePolyline = (encoded: string): Coordinates[] => {
    const points: Coordinates[] = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
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
        <Text style={styles.loadingText}>
          {geocodingStatus || "Préparation de la navigation..."}
        </Text>
        {!driverLocation && (
          <Text style={styles.destinationText}>🔍 Récupération de votre position...</Text>
        )}
        {driverLocation && !endPoint && (
          <Text style={styles.destinationText}>🔍 Localisation de {trip?.destination}...</Text>
        )}
        {trip?.destination && (
          <Text style={styles.destinationText}>Vers : {trip.destination}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bandeau d'information ETA */}
      {navigationActive && (
        <View style={styles.infoBanner}>
          <Text style={styles.destinationName}>🏁 {trip?.destination}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distance restante</Text>
              <Text style={styles.statValue}>{(remainingDistance / 1000).toFixed(1)} km</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Temps estimé</Text>
              <Text style={styles.statValue}>{eta.split("•")[0] || eta}</Text>
            </View>
          </View>
        </View>
      )}

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
        zoomEnabled={true}
        zoomTapEnabled={true}
      >
        <Marker coordinate={driverLocation} rotation={heading} flat>
          <Text style={{ fontSize: 32 }}>🚗</Text>
        </Marker>
        <Marker coordinate={endPoint} pinColor="red">
          <Text style={{ fontSize: 28 }}>🏁</Text>
        </Marker>

        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={6}
            strokeColor="#2563EB"
            lineDashPattern={navigationActive ? undefined : [10, 10]}
          />
        )}
      </MapView>

      {/* Bouton Retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.buttonText}>← Retour</Text>
      </TouchableOpacity>

      {/* Centrer sur la position */}
      <TouchableOpacity
        style={styles.recenterButton}
        onPress={() => {
          if (mapRef.current && driverLocation) {
            mapRef.current.animateToRegion({
              latitude: driverLocation.latitude,
              longitude: driverLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        }}
      >
        <Text style={styles.buttonText}>📍</Text>
      </TouchableOpacity>

      {/* Bouton Démarrer / Terminer la navigation */}
      {!navigationActive && !tripCompleted && routeCoords.length > 0 && (
        <TouchableOpacity style={styles.startButton} onPress={startNavigation}>
          <Text style={styles.startButtonText}>▶ Démarrer la navigation</Text>
        </TouchableOpacity>
      )}

      {!navigationActive && !tripCompleted && routeCoords.length === 0 && (
        <TouchableOpacity style={styles.startButtonDisabled} disabled>
          <Text style={styles.startButtonText}>⏳ Calcul de l'itinéraire...</Text>
        </TouchableOpacity>
      )}

      {navigationActive && !tripCompleted && (
        <TouchableOpacity style={styles.stopButton} onPress={completeTrip}>
          <Text style={styles.stopButtonText}>⏹ Terminer la course</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: { marginTop: 10, color: COLORS.textLight, fontSize: 14 },
  destinationText: { marginTop: 6, color: "#999", fontSize: 13 },
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
  destinationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
  },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { fontSize: 11, color: "#6B7280" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#2563EB", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: "#E5E7EB" },
  backButton: {
    position: "absolute",
    top: 120,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 10,
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
  startButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.success,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    zIndex: 10,
  },
  startButtonDisabled: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "#999",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    zIndex: 10,
  },
  startButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stopButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.danger,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    zIndex: 10,
  },
  stopButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});