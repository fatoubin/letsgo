import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TRAJETS = [
  {
    id: "1",
    depart: "Dakar",
    destination: "Thiès",
    heure: "07:30",
    places: 3,
    prix: "2 000 FCFA",
  },
  {
    id: "2",
    depart: "Ouakam",
    destination: "Plateau",
    heure: "08:15",
    places: 2,
    prix: "1 000 FCFA",
  },
];

export default function ListeTrajets() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trajets disponibles</Text>

      <FlatList
        data={TRAJETS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={18} color="#4DA3FF" />
              <Text style={styles.route}>
                {item.depart} → {item.destination}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.info}>🕒 {item.heure}</Text>
              <Text style={styles.info}>👥 {item.places} places</Text>
              <Text style={styles.info}>💰 {item.prix}</Text>
            </View>

            <TouchableOpacity style={styles.btn}>
              <Text style={styles.btnText}>Voir le trajet</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/client/trajet")}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#1F6FEB",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
  },
});
