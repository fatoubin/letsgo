import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const CATEGORIES = [
  { label: "Tous", icon: "apps-outline" },
  { label: "Covoiturage", icon: "car-outline" },
  { label: "Bus Urbain", icon: "bus-outline" },
  { label: "Interurbain", icon: "globe-outline" },
];

const TRAJETS = [
  { id: 1, depart: "Dakar", destination: "Thiès", heure: "07:30", prix: "1500 FCFA", type: "Interurbain", places: 3 },
  { id: 2, depart: "Ouakam", destination: "Plateau", heure: "08:00", prix: "500 FCFA", type: "Bus Urbain", places: 5 },
  { id: 3, depart: "Dakar", destination: "Mbour", heure: "09:00", prix: "2000 FCFA", type: "Interurbain", places: 2 },
  { id: 4, depart: "Parcelles", destination: "Centre-ville", heure: "08:30", prix: "300 FCFA", type: "Bus Urbain", places: 8 },
  { id: 5, depart: "Almadies", destination: "Plateau", heure: "10:00", prix: "400 FCFA", type: "Covoiturage", places: 2 },
];

const TYPE_COLORS: Record<string, string> = {
  "Interurbain": "#FFC107",
  "Bus Urbain": "#3DDC97",
  "Covoiturage": "#4DA3FF",
};

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Tous");

  const filtered = TRAJETS.filter((t) => {
    const matchSearch =
      t.depart.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "Tous" || t.type === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Explorer</Text>
        <Text style={styles.subtitle}>Trouvez votre trajet idéal</Text>
      </View>

      {/* BARRE DE RECHERCHE */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#5A6A8A" />
        <TextInput
          style={styles.searchInput}
          placeholder="Départ, destination..."
          placeholderTextColor="#5A6A8A"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color="#5A6A8A" />
          </TouchableOpacity>
        )}
      </View>

      {/* CATÉGORIES */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categories}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.label}
            style={[styles.catBtn, activeCategory === cat.label && styles.catBtnActive]}
            onPress={() => setActiveCategory(cat.label)}
          >
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={activeCategory === cat.label ? "#fff" : "#5A6A8A"}
            />
            <Text style={[styles.catLabel, activeCategory === cat.label && styles.catLabelActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* LISTE DES TRAJETS */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color="#1A2B4A" />
            <Text style={styles.emptyText}>Aucun trajet trouvé</Text>
          </View>
        ) : (
          filtered.map((t) => (
            <TouchableOpacity key={t.id} style={styles.card}>
              {/* Badge type */}
              <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[t.type] + "22" }]}>
                <Text style={[styles.typeText, { color: TYPE_COLORS[t.type] }]}>{t.type}</Text>
              </View>

              {/* Trajet */}
              <View style={styles.trajetRow}>
                <View style={styles.trajetPoint}>
                  <View style={[styles.dot, { backgroundColor: "#4DA3FF" }]} />
                  <Text style={styles.trajetVille}>{t.depart}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#5A6A8A" style={{ marginHorizontal: 8 }} />
                <View style={styles.trajetPoint}>
                  <View style={[styles.dot, { backgroundColor: "#3DDC97" }]} />
                  <Text style={styles.trajetVille}>{t.destination}</Text>
                </View>
              </View>

              {/* Infos */}
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={13} color="#5A6A8A" />
                  <Text style={styles.infoText}>{t.heure}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name="people-outline" size={13} color="#5A6A8A" />
                  <Text style={styles.infoText}>{t.places} places</Text>
                </View>
                <Text style={styles.prix}>{t.prix}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070F23",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#5A6A8A",
    fontSize: 14,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1C3A",
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#1A2B4A",
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
  },
  categories: {
    marginBottom: 16,
  },
  catBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#0F1C3A",
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  catBtnActive: {
    backgroundColor: "#1A4ED8",
    borderColor: "#1A4ED8",
  },
  catLabel: {
    color: "#5A6A8A",
    fontSize: 13,
    fontWeight: "600",
  },
  catLabelActive: {
    color: "#fff",
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: "#0F1C3A",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  typeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trajetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  trajetPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trajetVille: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    color: "#5A6A8A",
    fontSize: 12,
  },
  prix: {
    marginLeft: "auto",
    color: "#FACC15",
    fontWeight: "700",
    fontSize: 13,
  },
  empty: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    color: "#5A6A8A",
    fontSize: 15,
  },
});
