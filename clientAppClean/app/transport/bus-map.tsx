import { View, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { API_URL } from "../../lib/api";

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
  const [duration, setDuration] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressIndex, setProgressIndex] = useState(0);
  const intervalRef = useRef(null);

  // Récupérer l'itinéraire réel depuis l'API
  useEffect(() => {
    const fetchDirections = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/transport/directions?lat_depart=${start.latitude}&lon_depart=${start.longitude}&lat_arrivee=${end.latitude}&lon_arrivee=${end.longitude}`
        );
        const data = await response.json();
        
        if (data.success && data.points && data.points.length > 0) {
          setRouteCoords(data.points);
          setDuration(data.duration);
          setDistance(data.distance);
        } else {
          // Fallback: points intermédiaires simples
          const points = [];
          const steps = 30;
          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const lat = start.latitude + (end.latitude - start.latitude) * t;
            const lng = start.longitude + (end.longitude - start.longitude) * t;
            points.push({ latitude: lat, longitude: lng });
          }
          setRouteCoords(points);
          setDuration("30 min");
          setDistance("15 km");
        }
      } catch (error) {
        console.error("Erreur directions:", error);
        const points = [];
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const lat = start.latitude + (end.latitude - start.latitude) * t;
          const lng = start.longitude + (end.longitude - start.longitude) * t;
          points.push({ latitude: lat, longitude: lng });
        }
        setRouteCoords(points);
        setDuration("30 min");
        setDistance("15 km");
      } finally {
        setLoading(false);
      }
    };
    
    fetchDirections();
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

    intervalRef.current = setInterval(() => {
      if (currentIndex >= routeCoords.length - 1) {
        clearInterval(intervalRef.current);
        setFollowing(false);
        Alert.alert("Arrivée", `Le bus est arrivé à ${arriveeNom}`);
        return;
      }
      currentIndex++;
      setProgressIndex(currentIndex);
      const newPosition = routeCoords[currentIndex];
      if (newPosition) {
        setBusPosition(newPosition);
        
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newPosition.latitude,
            longitude: newPosition.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        }
      }
    }, 2000);
  };

  const stopFollowing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFollowing(false);
  };

  const resetTracking = () => {
    stopFollowing();
    setProgressIndex(0);
    setBusPosition(routeCoords[0] || start);
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
        <Text style={styles.loading}>Chargement de l'itinéraire...</Text>
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
          </View>
        </Marker>
        
        <Marker coordinate={end} title="Arrivée" pinColor="red">
          <View style={styles.markerEnd}>
            <Ionicons name="flag" size={20} color="#EF4444" />
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
            📍 Distance: {distance} | ⏱️ Durée: {duration}
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
              <Text style={styles.followText}>Suivre</Text>
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
  },
  markerEnd: {
    backgroundColor: "#EF4444",
    borderRadius: 20,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
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