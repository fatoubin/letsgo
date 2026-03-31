import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, getToken } from "../../lib/api";

type Trajet = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
  user_id?: number;
  created_at?: string;
};

export default function DetailTrajet() {
  const { id } = useLocalSearchParams();
  const [trajet, setTrajet] = useState<Trajet | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchTrajet();
  }, [id]);

  const fetchTrajet = async () => {
    try {
      const response = await fetch(`${API_URL}/api/client/trajets/${id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTrajet(data);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger le trajet");
    } finally {
      setLoading(false);
    }
  };

  const handleReserver = async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert("Connexion requise", "Veuillez vous connecter pour réserver");
      router.push("/auth/login");
      return;
    }

    setReserving(true);
    try {
      const response = await fetch(`${API_URL}/api/client/demandes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          depart: trajet?.depart,
          destination: trajet?.destination,
          date_depart: trajet?.heure?.split(" ")[0],
          heure_depart: trajet?.heure?.split(" ")[1],
          places: 1,
        }),
      });
      if (response.ok) {
        Alert.alert("Succès", "Demande de réservation envoyée !", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Erreur", "Impossible de réserver");
      }
    } catch (error) {
      Alert.alert("Erreur", "Erreur réseau");
    } finally {
      setReserving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!trajet) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Trajet non trouvé</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Détail du trajet</Text>

        <View style={styles.routeContainer}>
          <Ionicons name="location-outline" size={24} color="#4DA3FF" />
          <Text style={styles.routeText}>{trajet.depart} → {trajet.destination}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="#9AA4BF" />
          <Text style={styles.infoText}>
            {new Date(trajet.heure).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={20} color="#9AA4BF" />
          <Text style={styles.infoText}>{trajet.places} places disponibles</Text>
        </View>

        <TouchableOpacity
          style={[styles.reserveBtn, reserving && styles.disabled]}
          onPress={handleReserver}
          disabled={reserving}
        >
          {reserving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.reserveBtnText}>Réserver</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B132B", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: { marginBottom: 20, width: 40 },
  card: { backgroundColor: "#1C2541", borderRadius: 20, padding: 20 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  routeContainer: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  routeText: { color: "#fff", fontSize: 18, marginLeft: 12, flex: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoText: { color: "#9AA4BF", fontSize: 16, marginLeft: 12 },
  reserveBtn: { backgroundColor: "#2563EB", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20 },
  reserveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  disabled: { opacity: 0.6 },
  errorText: { color: "#fff", fontSize: 16 },
  backBtn: { marginTop: 20, backgroundColor: "#1F6FEB", padding: 10, borderRadius: 8 },
  backBtnText: { color: "#fff" },
});