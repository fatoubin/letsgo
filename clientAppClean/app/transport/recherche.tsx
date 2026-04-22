import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

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

  // Coordonnées approximatives si non fournies
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
  const intervalRef = useRef(null);

  // Générer des points intermédiaires pour un tracé réaliste
  useEffect(() => {
    const points = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const lat = start.latitude + (end.latitude - start.latitude) * t;
      const lng = start.longitude + (end.longitude - start.longitude) * t;
      points.push({ latitude: lat, longitude: lng });
    }
    setRouteCoords(points);
    setBusPosition(start);
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
    let progress = 0;

    intervalRef.current = setInterval(() => {
      if (progress >= 1) {
        clearInterval(intervalRef.current);
        setFollowing(false);
        Alert.alert("Arrivée", `Le bus est arrivé à ${arriveeNom}`);
        return;
      }
      progress += 0.01; // Avance de 1% par intervalle
      const newLat = start.latitude + (end.latitude - start.latitude) * progress;
      const newLng = start.longitude + (end.longitude - start.longitude) * progress;
      setBusPosition({ latitude: newLat, longitude: newLng });
      
      // Centrer la carte sur le bus
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLat,
          longitude: newLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      }
    }, 2000); // Déplacement toutes les 2 secondes
  };

  const stopFollowing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFollowing(false);
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

  if (routeCoords.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Chargement de la carte...</Text>
      </View>
    );
  }

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
        {/* Point de départ */}
        <Marker coordinate={start} title="Départ" pinColor="green">
          <View style={styles.markerStart}>
            <Ionicons name="flag" size={20} color="#10B981" />
          </View>
        </Marker>
        
        {/* Point d'arrivée */}
        <Marker coordinate={end} title="Arrivée" pinColor="red">
          <View style={styles.markerEnd}>
            <Ionicons name="flag" size={20} color="#EF4444" />
          </View>
        </Marker>
        
        {/* Position du bus */}
        <Marker coordinate={busPosition} title={`Bus ligne ${ligneNumero}`}>
          <View style={styles.markerBus}>
            <Ionicons name="bus" size={24} color="#fff" />
          </View>
        </Marker>
        
        {/* Tracé de l'itinéraire */}
        <Polyline
          coordinates={routeCoords}
          strokeWidth={4}
          strokeColor="#2563EB"
          lineDashPattern={[5, 5]}
        />
      </MapView>

      {/* Contrôles */}
      <View style={styles.controls}>
        <View style={styles.info}>
          <Text style={styles.infoText}>
            🚏 {departNom} → {arriveeNom}
          </Text>
          <Text style={styles.infoText}>
            {following ? "🚌 Suivi en cours..." : "⏸ Suivi arrêté"}
          </Text>
        </View>
        
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
  infoText: { color: "#9AA4BF", fontSize: 12, textAlign: "center" },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  followText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B132B" },
  loading: { color: "#fff" },
});