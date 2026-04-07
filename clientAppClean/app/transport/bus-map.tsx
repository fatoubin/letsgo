import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState, useRef } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

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

  // Vérification des coordonnées
  if (!departLat || !departLon || !arriveeLat || !arriveeLon) {
    Alert.alert("Erreur", "Coordonnées manquantes pour afficher la carte.");
    router.back();
    return null;
  }

  const start = {
    latitude: parseFloat(departLat),
    longitude: parseFloat(departLon),
  };
  const end = {
    latitude: parseFloat(arriveeLat),
    longitude: parseFloat(arriveeLon),
  };

  const [busPosition, setBusPosition] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [following, setFollowing] = useState(false);
  const intervalRef = useRef(null);

  // Initialisation : position du bus (milieu du trajet) et tracé
  useEffect(() => {
    const midLat = (start.latitude + end.latitude) / 2;
    const midLng = (start.longitude + end.longitude) / 2;
    setBusPosition({ latitude: midLat, longitude: midLng });
    setRouteCoords([start, end]);
  }, []);

  // Nettoyage de l'intervalle au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startFollowing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFollowing(true);
    let progress = 0.5; // le bus est déjà à 50% du trajet (position initiale)
    intervalRef.current = setInterval(() => {
      if (progress >= 1) {
        clearInterval(intervalRef.current);
        setFollowing(false);
        Alert.alert("Arrivée", "Le bus est arrivé à destination.");
        return;
      }
      progress += 0.02; // avance de 2% toutes les 3 secondes
      const newLat = start.latitude + (end.latitude - start.latitude) * progress;
      const newLng = start.longitude + (end.longitude - start.longitude) * progress;
      setBusPosition({ latitude: newLat, longitude: newLng });
    }, 3000);
  };

  const stopFollowing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFollowing(false);
  };

  if (!busPosition || routeCoords.length === 0) {
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
        {!following ? (
          <TouchableOpacity style={styles.followBtn} onPress={startFollowing}>
            <Ionicons name="radio-button-on" size={20} color="#4CAF50" />
            <Text style={styles.followText}>Suivre</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.followBtnActive} onPress={stopFollowing}>
            <Ionicons name="pause" size={20} color="#fff" />
            <Text style={styles.followText}>Arrêter</Text>
          </TouchableOpacity>
        )}
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: (start.latitude + end.latitude) / 2,
          longitude: (start.longitude + end.longitude) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={start} title="Départ" pinColor="green" />
        <Marker coordinate={end} title="Arrivée" pinColor="red" />
        <Marker coordinate={busPosition} title={`Bus ligne ${ligneNumero}`}>
          <Ionicons name="bus" size={32} color="#2563EB" />
        </Marker>
        <Polyline
          coordinates={routeCoords}
          strokeWidth={4}
          strokeColor="#2563EB"
        />
      </MapView>

      <View style={styles.info}>
        <Text style={styles.infoText}>Trajet : {departNom} → {arriveeNom}</Text>
        <Text style={styles.infoText}>
          {following
            ? "Suivi en temps réel (simulation)"
            : "Cliquez sur 'Suivre' pour voir le bus avancer"}
        </Text>
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
  title: { color: "#fff", fontSize: 18, fontWeight: "bold", marginLeft: 16, flex: 1 },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  followBtnActive: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF5252",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  followText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loading: { color: "#fff" },
  info: {
    padding: 16,
    backgroundColor: "#1F2A52",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  infoText: { color: "#9AA4BF", marginBottom: 4 },
});