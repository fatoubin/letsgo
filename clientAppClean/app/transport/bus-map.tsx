import { View, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

// 🔑 INSÉREZ VOTRE CLÉ API OPENROUTESERVICE ICI
const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImY2ZGRhNmM1MGNjOTQxOGNiZjcxMDVkNGQyNDExZjljIiwiaCI6Im11cm11cjY0In0=";

export default function BusMapScreen() {
  const params = useLocalSearchParams();
  const {
    ligneNumero,
    departNom,
    arriveeNom,
    departLat,
    departLon,
    arriveeLat,
    arriveeLon,
  } = params;

  const mapRef = useRef(null);

  const start = {
    latitude: departLat ? parseFloat(departLat) : 14.7167,
    longitude: departLon ? parseFloat(departLon) : -17.4677,
  };
  const end = {
    latitude: arriveeLat ? parseFloat(arriveeLat) : 14.6937,
    longitude: arriveeLon ? parseFloat(arriveeLon) : -17.444,
  };

  const [busPosition, setBusPosition] = useState(start);
  const [routeCoords, setRouteCoords] = useState([]);
  const [following, setFollowing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [duration, setDuration] = useState(null);      // en minutes
  const [distance, setDistance] = useState(null);      // en km
  const [loading, setLoading] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const intervalRef = useRef(null);

  // 📍 1. Fonction pour appeler l'API OpenRouteService
  const fetchOpenRouteServiceRoute = async () => {
    try {
      // L'API ORS attend les coordonnées au format "lon,lat" (longitude, latitude)
      const startCoord = `${start.longitude},${start.latitude}`;
      const endCoord = `${end.longitude},${end.latitude}`;
      
      // Choix du profil : 'driving-car' pour voiture, 'foot-walking' pour piéton, 'cycling-regular' pour vélo
      // Pour un bus, 'driving-car' est le plus adapté car il suit les routes
      const profile = 'driving-car';
      
      const url = `https://api.openrouteservice.org/v2/directions/${profile}?api_key=${ORS_API_KEY}&start=${startCoord}&end=${endCoord}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const route = data.features[0];
        const geometry = route.geometry.coordinates; // Tableau de [lon, lat]
        const segments = route.properties.segments[0];
        
        // Convertir les coordonnées ORS (lon, lat) au format MapView (lat, lon)
        const points = geometry.map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));
        
        // Durée en secondes -> minutes
        const durationSeconds = segments.duration;
        const durationMinutes = Math.ceil(durationSeconds / 60);
        
        // Distance en mètres -> kilomètres
        const distanceMeters = segments.distance;
        const distanceKm = (distanceMeters / 1000).toFixed(1);
        
        setDuration(durationMinutes);
        setDistance(`${distanceKm} km`);
        
        return { points, duration: durationMinutes, distance: parseFloat(distanceKm) };
      } else {
        throw new Error("Aucun itinéraire trouvé par ORS");
      }
    } catch (error) {
      console.error("Erreur ORS:", error);
      // Fallback si ORS échoue
      return null;
    }
  };

  // 📍 2. Calcul manuel de secours (si ORS échoue)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const generateFallbackRoute = () => {
    const points = [];
    const steps = 40;
    const directDistance = calculateDistance(start.latitude, start.longitude, end.latitude, end.longitude);
    const estimatedMinutes = Math.ceil((directDistance / 25) * 60);
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const curve = Math.sin(t * Math.PI) * 0.002;
      let lat = start.latitude + (end.latitude - start.latitude) * t;
      let lng = start.longitude + (end.longitude - start.longitude) * t;
      const dx = end.longitude - start.longitude;
      const dy = end.latitude - start.latitude;
      const perpX = -dy;
      const perpY = dx;
      const norm = Math.sqrt(perpX * perpX + perpY * perpY);
      if (norm > 0) {
        lat += (perpY / norm) * curve;
        lng += (perpX / norm) * curve;
      }
      points.push({ latitude: lat, longitude: lng });
    }
    
    setDuration(estimatedMinutes);
    setDistance(`${directDistance.toFixed(1)} km`);
    return { points, duration: estimatedMinutes, distance: directDistance };
  };

  const calculateArrivalTime = (durationMinutes) => {
    const now = new Date();
    const arrival = new Date(now.getTime() + durationMinutes * 60000);
    return arrival.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    const initRoute = async () => {
      setLoading(true);
      
      // Tentative avec OpenRouteService
      let routeData = await fetchOpenRouteServiceRoute();
      let points;
      
      if (routeData && routeData.points.length > 0) {
        points = routeData.points;
      } else {
        // Fallback si ORS échoue
        console.log("ORS a échoué, utilisation du fallback");
        const fallback = generateFallbackRoute();
        points = fallback.points;
        routeData = fallback;
      }
      
      setRouteCoords(points);
      if (routeData && routeData.duration) {
        const arrivalTime = calculateArrivalTime(routeData.duration);
        setEstimatedArrival(arrivalTime);
      }
      
      setLoading(false);
    };
    
    initRoute();
  }, []);

  // Récupérer la position de l'utilisateur
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      }
    })();
  }, []);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startFollowing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFollowing(true);
    let currentIndex = progressIndex;

    const totalSegments = routeCoords.length - 1;
    const timePerSegment = (duration * 60 * 1000) / totalSegments;
    
    intervalRef.current = setInterval(() => {
      if (currentIndex >= routeCoords.length - 1) {
        clearInterval(intervalRef.current);
        setFollowing(false);
        Alert.alert("Arrivée", `Le bus est arrivé à ${arriveeNom} vers ${estimatedArrival}`);
        return;
      }
      currentIndex++;
      setProgressIndex(currentIndex);
      const newPosition = routeCoords[currentIndex];
      if (newPosition) {
        setBusPosition(newPosition);
        
        const remainingSegments = routeCoords.length - 1 - currentIndex;
        const remainingTimeMinutes = Math.ceil((remainingSegments * timePerSegment) / 60000);
        const newArrivalTime = new Date(Date.now() + remainingTimeMinutes * 60000);
        setEstimatedArrival(newArrivalTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newPosition.latitude,
            longitude: newPosition.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }
      }
    }, Math.min(timePerSegment, 3000));
  };

  const stopFollowing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFollowing(false);
  };

  const resetTracking = () => {
    stopFollowing();
    setProgressIndex(0);
    setBusPosition(routeCoords[0] || start);
    if (duration) {
      setEstimatedArrival(calculateArrivalTime(duration));
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const centerOnBus = () => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: busPosition.latitude,
        longitude: busPosition.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loading}>Calcul de l'itinéraire avec OpenRouteService...</Text>
      </View>
    );
  }

  const progressPercent = routeCoords.length > 0 ? (progressIndex / (routeCoords.length - 1)) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Bus ligne {ligneNumero}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={centerOnUser} style={styles.headerBtn}>
            <Ionicons name="person" size={20} color="#4DA3FF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={centerOnBus} style={styles.headerBtn}>
            <Ionicons name="bus" size={20} color="#4DA3FF" />
          </TouchableOpacity>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: (start.latitude + end.latitude) / 2,
          longitude: (start.longitude + end.longitude) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={start} title="Départ" pinColor="green">
          <View style={styles.markerStart}>
            <Ionicons name="flag" size={20} color="#10B981" />
            <Text style={styles.markerLabel}>{departNom}</Text>
          </View>
        </Marker>
        
        <Marker coordinate={end} title="Arrivée" pinColor="red">
          <View style={styles.markerEnd}>
            <Ionicons name="flag" size={20} color="#EF4444" />
            <Text style={styles.markerLabel}>{arriveeNom}</Text>
          </View>
        </Marker>
        
        <Marker coordinate={busPosition} title={`Bus ligne ${ligneNumero}`}>
          <View style={styles.markerBus}>
            <Ionicons name="bus" size={24} color="#fff" />
          </View>
        </Marker>
        
        <Polyline
          coordinates={routeCoords}
          strokeWidth={4}
          strokeColor="#2563EB"
        />
      </MapView>

      <View style={styles.controls}>
        <View style={styles.info}>
          <Text style={styles.infoText}>
            🚏 {departNom} → {arriveeNom}
          </Text>
          <Text style={styles.infoText}>
            📍 Distance: {distance} | ⏱️ Durée estimée: {duration} min
          </Text>
          <Text style={styles.infoText}>
            🕐 Arrivée prévue vers {estimatedArrival}
          </Text>
          <Text style={styles.infoText}>
            {following ? "🚌 Suivi en cours..." : "⏸ Suivi arrêté"}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(progressPercent)}% du trajet</Text>
        </View>
        
        <View style={styles.buttonRow}>
          {!following ? (
            <TouchableOpacity style={styles.followBtn} onPress={startFollowing}>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.followText}>Suivre le bus</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={stopFollowing}>
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.followText}>Arrêter</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.resetBtn} onPress={resetTracking}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.followText}>Recommencer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B132B" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#0B132B",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold", flex: 1, marginLeft: 16 },
  headerButtons: { flexDirection: "row", gap: 12 },
  headerBtn: { padding: 8 },
  map: { flex: 1 },
  markerStart: {
    backgroundColor: "#10B981",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
  },
  markerEnd: {
    backgroundColor: "#EF4444",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
  },
  markerLabel: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  markerBus: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  controls: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
  },
  info: {
    backgroundColor: "#1F2A52",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: { color: "#9AA4BF", fontSize: 12, textAlign: "center", marginBottom: 4 },
  progressBar: {
    height: 6,
    backgroundColor: "#2A3655",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  progressText: { color: "#4DA3FF", fontSize: 10, textAlign: "center", marginTop: 4 },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
  },
  followBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  stopBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  resetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  followText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B132B" },
  loading: { color: "#fff", marginTop: 10 },
});