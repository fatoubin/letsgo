import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons name="menu" size={26} color="#fff" />

        <Text style={styles.logo}>SAMABUS</Text>

        <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
          <Ionicons name="person-circle" size={30} color="#4DA3FF" />
        </TouchableOpacity>
      </View>

      {/* MENU DÉROULANT */}
      {showMenu && (
        <View style={styles.dropdown}>
       <TouchableOpacity
  style={styles.dropdownItem}
  onPress={() => {
    setShowMenu(false);
    router.push("/client/mes-planifications");
  }}
>
  <Ionicons name="calendar-outline" size={18} color="#fff" />
  <Text style={styles.dropdownText}>Mes planifications</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.dropdownItem}
  onPress={() => {
    setShowMenu(false);
    router.push("/client/mes-reservations");
  }}
>
  <Ionicons name="bookmark-outline" size={18} color="#fff" />
  <Text style={styles.dropdownText}>Mes réservations</Text>
</TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/compte");
            }}
          >
            <Ionicons name="person-outline" size={18} color="#fff" />
            <Text style={styles.dropdownText}>Mon compte</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              router.replace("/auth/login");
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#ff6b6b" />
            <Text style={[styles.dropdownText, { color: "#ff6b6b" }]}>
              Déconnexion
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* IMAGE BANNIÈRE */}
      <Image
        source={require("../../assets/images/home-banner.png")}
        style={styles.heroImage}
      />

      {/* COVOITURAGE */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="car" size={22} color="#4DA3FF" />
          <Text style={styles.cardTitle}>Covoiturage</Text>
        </View>

        <Text style={styles.cardSubtitle}>
          Déplacez-vous plus simplement à Dakar
        </Text>

             <View style={styles.row}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={() => router.push("/client/planifier")}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.btnText}>Planifier un trajet</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => router.push("/client/liste-trajets")}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.btnText}>Voir les trajets</Text>
          </TouchableOpacity>
        </View>
          </View>

        
      

     {/* BUS URBAIN (Dakar) */}
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Ionicons name="bus" size={22} color="#3DDC97" />
    <Text style={styles.cardTitle}>Bus Urbain (Dakar)</Text>
  </View>
  <Text style={styles.cardSubtitle}>
    Trouvez un itinéraire à l’intérieur de Dakar
  </Text>
  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: "#1E6F5C" }]}
    onPress={() => router.push("/transport/recherche")}
  >
    <Ionicons name="map" size={22} color="#fff" />
    <Text style={styles.btnText}>Rechercher un trajet</Text>
  </TouchableOpacity>
</View>

{/* BUS INTERURBAIN (vers autres régions) */}
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Ionicons name="bus-outline" size={22} color="#FFC107" />
    <Text style={styles.cardTitle}>Bus Interurbain</Text>
  </View>
  <Text style={styles.cardSubtitle}>
    Voyagez vers les autres régions (Mbour, Thiès, etc.)
  </Text>
  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: "#247B9E" }]}
    onPress={() => router.push("/transport/interurbain")}
  >
    <Ionicons name="globe" size={22} color="#fff" />
    <Text style={styles.btnText}>Rechercher un trajet</Text>
  </TouchableOpacity>
</View>


      {/* FAVORIS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="star" size={22} color="#FFC107" />
          <Text style={styles.cardTitle}>Trajets favoris</Text>
        </View>

        <TouchableOpacity style={styles.favoriteItem}>
          <Text style={styles.favoriteText}>📍 Dakar → Thiès</Text>
          <Text style={styles.time}>07:30</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.favoriteItem}>
          <Text style={styles.favoriteText}>📍 Ouakam → Plateau</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addFav}>
          <Text style={styles.addFavText}>+ Ajouter un favori</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 15,
  },

  logo: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  heroImage: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    marginBottom: 20,
  },

  dropdown: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: "#121C3A",
    borderRadius: 14,
    paddingVertical: 8,
    width: 180,
    zIndex: 100,
    elevation: 6,
  },

  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  dropdownText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },

  card: {
    backgroundColor: "#121C3A",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },

  cardSubtitle: {
    color: "#9AA4BF",
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },

  primaryBtn: {
    backgroundColor: "#2563EB",
  },

  secondaryBtn: {
    backgroundColor: "#1D4ED8",
  },

  transportBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
  },

  btnText: {
    color: "#fff",
    fontWeight: "600",
  },

  favoriteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2A52",
  },

  favoriteText: {
    color: "#fff",
  },

  time: {
    color: "#FACC15",
    fontWeight: "600",
  },

  addFav: {
    alignItems: "center",
    marginTop: 12,
  },

  addFavText: {
    color: "#4DA3FF",
    fontWeight: "600",
  },
});
