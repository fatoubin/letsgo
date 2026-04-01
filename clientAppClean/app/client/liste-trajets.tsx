import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../lib/api";

type Trajet = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
   prix?: number; 
  // prix n'est pas encore dans la base, donc on peut l'ignorer ou calculer fictivement
};

export default function ListeTrajets() {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrajets = async () => {
      try {
        const response = await fetch(`${API_URL}/api/client/trajets`);
        if (!response.ok) throw new Error("Erreur serveur");
        const data = await response.json();
        setTrajets(data);
      } catch (error) {
        console.error(error);
        Alert.alert("Erreur", "Impossible de charger les trajets");
      } finally {
        setLoading(false);
      }
    };

    fetchTrajets();
  }, []);

  const formatHeure = (datetime: string) => {
    // Si la colonne `heure` est au format "YYYY-MM-DD HH:MM:SS", on extrait l'heure
    return datetime.split(" ")[1]?.substring(0, 5) || datetime;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4DA3FF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trajets disponibles</Text>

      <FlatList
        data={trajets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun trajet disponible pour le moment.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={18} color="#4DA3FF" />
              <Text style={styles.route}>
                {item.depart} → {item.destination}
              </Text>
            </View>

            <View style={styles.infoRow}>
  <Text style={styles.info}>🕒 {formatHeure(item.heure)}</Text>
  <Text style={styles.info}>👥 {item.places} places</Text>
  <Text style={styles.info}>
    💰 {item.prix !== undefined && item.prix !== null
          ? `${item.prix.toLocaleString()} FCFA`
          : "Prix non spécifié"}
  </Text>
</View>

            <TouchableOpacity
              style={styles.btn}
             onPress={() => router.push(`/client/details-trajets?id=${item.id}`)}
            >
              <Text style={styles.btnText}>Voir le trajet</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9AA4BF",
    marginTop: 10,
  },
  emptyText: {
    color: "#9AA4BF",
    textAlign: "center",
    marginTop: 50,
  },
  card: {
    backgroundColor: "#1C2541",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  route: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  info: {
    color: "#C5D1EB",
    fontSize: 13,
  },
  btn: {
    marginTop: 10,
    backgroundColor: "#1F6FEB",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
  },
});