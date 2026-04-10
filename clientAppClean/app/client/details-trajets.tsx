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
  prix?: number;
  places: number;
  user_id?: number;
  created_at?: string;
};

export default function DetailTrajet() {
  const { id } = useLocalSearchParams();
  const [trajet, setTrajet] = useState<Trajet | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [nombrePlaces, setNombrePlaces] = useState(1); // 👈 Ajouté

  useEffect(() => {
    if (!id) return;
    fetchTrajet();
  }, [id]);

  const fetchTrajet = async () => {
    try {
      const response = await fetch(`${API_URL}/api/client/trajets/${id}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      console.log("🔍 Données du trajet :", data);
      setTrajet(data);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger le trajet");
    } finally {
      setLoading(false);
    }
  };

  const handleReserver = async () => {
    const token = await getToken();
    console.log("🔑 Token utilisateur :", token ? "présent" : "absent");
    
    if (!token) {
      Alert.alert("Connexion requise", "Veuillez vous connecter pour réserver");
      router.push("/auth/login");
      return;
    }

    if (!trajet) return;

    // Vérifier qu'il y a assez de places
    if (nombrePlaces > trajet.places) {
      Alert.alert("Erreur", `Il ne reste que ${trajet.places} place(s) disponible(s)`);
      return;
    }

    setReserving(true);
    try {
      const response = await fetch(`${API_URL}/api/client/reserver`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          trip_id: trajet.id,
          places: nombrePlaces,  // 👈 Utilise la variable
        }),
      });

      const responseText = await response.text();
      console.log("📡 Réponse serveur :", responseText);

      if (response.ok) {
        Alert.alert("Succès", `${nombrePlaces} place(s) réservée(s) avec succès !`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        let errorMessage = "Impossible de réserver";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {}
        Alert.alert("Erreur", errorMessage);
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
      Alert.alert("Erreur", "Erreur réseau");
    } finally {
      setReserving(false);
    }
  };

  // Fonctions pour augmenter/diminuer le nombre de places
  const augmenterPlaces = () => {
    if (trajet && nombrePlaces < trajet.places) {
      setNombrePlaces(nombrePlaces + 1);
    }
  };

  const diminuerPlaces = () => {
    if (nombrePlaces > 1) {
      setNombrePlaces(nombrePlaces - 1);
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

        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={20} color="#9AA4BF" />
          <Text style={styles.infoText}>
            {trajet.prix ? `${trajet.prix.toLocaleString()} FCFA` : "Prix non spécifié"}
          </Text>
        </View>

        {/* 👇 Sélecteur de nombre de places */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorLabel}>Nombre de places :</Text>
          <View style={styles.selector}>
            <TouchableOpacity onPress={diminuerPlaces} style={styles.selectorBtn}>
              <Ionicons name="remove-circle-outline" size={32} color="#4DA3FF" />
            </TouchableOpacity>
            <Text style={styles.selectorValue}>{nombrePlaces}</Text>
            <TouchableOpacity onPress={augmenterPlaces} style={styles.selectorBtn}>
              <Ionicons name="add-circle-outline" size={32} color="#4DA3FF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.selectorHint}>
            Prix total : {(trajet.prix || 0) * nombrePlaces.toLocaleString()} FCFA
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.reserveBtn, reserving && styles.disabled]}
          onPress={handleReserver}
          disabled={reserving}
        >
          {reserving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.reserveBtnText}>
              Réserver {nombrePlaces > 1 ? `${nombrePlaces} places` : "1 place"}
            </Text>
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
  // Nouveaux styles pour le sélecteur
  selectorContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  selectorLabel: {
    color: "#9AA4BF",
    fontSize: 14,
    marginBottom: 10,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  selectorBtn: {
    padding: 8,
  },
  selectorValue: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: "center",
  },
  selectorHint: {
    color: "#4ADE80",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
});