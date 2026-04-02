import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
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
};

export default function ListeTrajets() {
  const [trajets, setTrajets] = useState<Trajet[]>([]);
  const [filteredTrajets, setFilteredTrajets] = useState<Trajet[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour les filtres
  const [searchDepart, setSearchDepart] = useState("");
  const [searchDestination, setSearchDestination] = useState("");
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    fetchTrajets();
  }, []);

  // Filtrer les trajets à chaque changement des critères
  useEffect(() => {
    let filtered = trajets;
    
    if (searchDepart.trim()) {
      filtered = filtered.filter(t => 
        t.depart.toLowerCase().includes(searchDepart.toLowerCase())
      );
    }
    if (searchDestination.trim()) {
      filtered = filtered.filter(t => 
        t.destination.toLowerCase().includes(searchDestination.toLowerCase())
      );
    }
    if (searchDate.trim()) {
      filtered = filtered.filter(t => 
        t.heure.split("T")[0] === searchDate // format YYYY-MM-DD
      );
    }
    
    setFilteredTrajets(filtered);
  }, [searchDepart, searchDestination, searchDate, trajets]);

  const fetchTrajets = async () => {
    try {
      const response = await fetch(`${API_URL}/api/client/trajets`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setTrajets(data);
      setFilteredTrajets(data);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les trajets");
    } finally {
      setLoading(false);
    }
  };

  const formatHeure = (datetime: string) => {
    const timePart = datetime.split("T")[1];
    return timePart ? timePart.substring(0,5) : datetime;
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

      {/* Champs de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Départ (ex: Dakar)"
          placeholderTextColor="#9AA4BF"
          value={searchDepart}
          onChangeText={setSearchDepart}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Destination (ex: Saint-Louis)"
          placeholderTextColor="#9AA4BF"
          value={searchDestination}
          onChangeText={setSearchDestination}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Date (YYYY-MM-DD)"
          placeholderTextColor="#9AA4BF"
          value={searchDate}
          onChangeText={setSearchDate}
        />
      </View>

      <FlatList
        data={filteredTrajets}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun trajet ne correspond à vos critères.</Text>
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
                💰 {item.prix ? `${item.prix.toLocaleString()} FCFA` : "Prix non spécifié"}
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
  container: { flex: 1, backgroundColor: "#0B132B", paddingHorizontal: 16, paddingTop: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#9AA4BF", marginTop: 10 },
  emptyText: { color: "#9AA4BF", textAlign: "center", marginTop: 50 },
  searchContainer: { marginBottom: 16 },
  searchInput: {
    backgroundColor: "#1C2541",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    fontSize: 14,
  },
  card: { backgroundColor: "#1C2541", borderRadius: 16, padding: 16, marginBottom: 14 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  route: { color: "#fff", fontSize: 16, marginLeft: 8, fontWeight: "600" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  info: { color: "#C5D1EB", fontSize: 13 },
  btn: { marginTop: 10, backgroundColor: "#1F6FEB", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});