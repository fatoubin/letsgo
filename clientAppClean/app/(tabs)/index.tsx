import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getUser } from "../../lib/api";

export default function HomeScreen() {
  const [showMenu, setShowMenu] = useState(false);
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    async function loadUser() {
      const user = await getUser();
      if (user?.prenom) {
        setPrenom(user.prenom);
      }
    }
    loadUser();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.logo}>SAMABUS</Text>

        <TouchableOpacity onPress={() => setShowMenu(!showMenu)} style={styles.avatarBtn}>
          <Ionicons name="person-circle" size={32} color="#4DA3FF" />
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
            <Ionicons name="calendar-outline" size={16} color="#4DA3FF" />
            <Text style={styles.dropdownText}>Mes planifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/client/mes-reservations");
            }}
          >
            <Ionicons name="bookmark-outline" size={16} color="#4DA3FF" />
            <Text style={styles.dropdownText}>Mes réservations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/client/mes-reservations-interurbaines");
            }}
          >
            <Ionicons name="bus-outline" size={16} color="#4DA3FF" />
            <Text style={styles.dropdownText}>Mes réservations (Bus)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/compte");
            }}
          >
            <Ionicons name="person-outline" size={16} color="#4DA3FF" />
            <Text style={styles.dropdownText}>Mon compte</Text>
          </TouchableOpacity>

          <View style={styles.dropdownDivider} />

          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setShowMenu(false);
              router.replace("/auth/login");
            }}
          >
            <Ionicons name="log-out-outline" size={16} color="#ff6b6b" />
            <Text style={[styles.dropdownText, { color: "#ff6b6b" }]}>
              Déconnexion
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* GREETING avec nom */}
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>
          Bonjour{prenom ? `, ${prenom}` : ""} 👋
        </Text>
        <Text style={styles.greetingSubtext}>Où allez-vous aujourd'hui ?</Text>
      </View>

      {/* IMAGE BANNIÈRE */}
      <Image
        source={require("../../assets/images/home-banner.png")}
        style={styles.heroImage}
      />

      {/* SECTION TITRE */}
      <Text style={styles.sectionTitle}>Services</Text>

      {/* COVOITURAGE */}
      <View style={[styles.card, styles.cardCovoiturage]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBadge}>
            <Ionicons name="car" size={20} color="#4DA3FF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Covoiturage</Text>
            <Text style={styles.cardSubtitle}>Déplacez-vous plus simplement à Dakar</Text>
          </View>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={() => router.push("/client/planifier")}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Planifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={() => router.push("/client/liste-trajets")}
          >
            <Ionicons name="search-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Voir les trajets</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BUS URBAIN */}
      <View style={[styles.card, styles.cardUrbain]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconBadge, { backgroundColor: "#0D3D2E" }]}>
            <Ionicons name="bus" size={20} color="#3DDC97" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Bus Urbain <Text style={styles.tagDakar}>Dakar</Text></Text>
            <Text style={styles.cardSubtitle}>Itinéraire à l'intérieur de Dakar</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, styles.urbainBtn]}
          onPress={() => router.push("/transport/recherche")}
        >
          <Ionicons name="map-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Rechercher un trajet</Text>
        </TouchableOpacity>
      </View>

      {/* BUS INTERURBAIN */}
      <View style={[styles.card, styles.cardInterurbain]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconBadge, { backgroundColor: "#2C1F00" }]}>
            <Ionicons name="bus-outline" size={20} color="#FFC107" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Bus Interurbain</Text>
            <Text style={styles.cardSubtitle}>Mbour, Thiès, et autres régions</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, styles.interurbainBtn]}
          onPress={() => router.push("/transport/interurbain")}
        >
          <Ionicons name="globe-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Rechercher un trajet</Text>
        </TouchableOpacity>
      </View>

      {/* FAVORIS */}
      <Text style={styles.sectionTitle}>Favoris</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.favoriteItem}>
          <View style={styles.favoriteLeft}>
            <View style={[styles.dot, { backgroundColor: "#4DA3FF" }]} />
            <Text style={styles.favoriteText}>Dakar → Thiès</Text>
          </View>
          <Text style={styles.time}>07:30</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.favoriteItem, { borderBottomWidth: 0 }]}>
          <View style={styles.favoriteLeft}>
            <View style={[styles.dot, { backgroundColor: "#3DDC97" }]} />
            <Text style={styles.favoriteText}>Ouakam → Plateau</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addFav}>
          <Ionicons name="add-circle-outline" size={16} color="#4DA3FF" />
          <Text style={styles.addFavText}>Ajouter un favori</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 90 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070F23",
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 52,
    marginBottom: 8,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#111D3C",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  greeting: {
    marginTop: 16,
    marginBottom: 16,
  },
  greetingText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  greetingSubtext: {
    color: "#5A6A8A",
    fontSize: 14,
    marginTop: 2,
  },
  heroImage: {
    width: "100%",
    height: 160,
    borderRadius: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#8899BB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 2,
  },
  dropdown: {
    position: "absolute",
    top: 95,
    right: 0,
    backgroundColor: "#0F1C3A",
    borderRadius: 16,
    paddingVertical: 6,
    width: 210,
    zIndex: 100,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#1E2D50",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  dropdownText: {
    color: "#CBD5E8",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: "#1E2D50",
    marginVertical: 4,
    marginHorizontal: 12,
  },
  card: {
    backgroundColor: "#0F1C3A",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  cardCovoiturage: {
    borderLeftWidth: 3,
    borderLeftColor: "#4DA3FF",
  },
  cardUrbain: {
    borderLeftWidth: 3,
    borderLeftColor: "#3DDC97",
  },
  cardInterurbain: {
    borderLeftWidth: 3,
    borderLeftColor: "#FFC107",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0D2040",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  tagDakar: {
    color: "#3DDC97",
    fontSize: 13,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#5A6A8A",
    fontSize: 13,
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
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryBtn: {
    backgroundColor: "#1A4ED8",
  },
  secondaryBtn: {
    backgroundColor: "#162D6B",
  },
  urbainBtn: {
    backgroundColor: "#0D4A35",
  },
  interurbainBtn: {
    backgroundColor: "#3A2800",
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  favoriteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#152040",
  },
  favoriteLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  favoriteText: {
    color: "#CBD5E8",
    fontSize: 14,
    fontWeight: "500",
  },
  time: {
    color: "#FACC15",
    fontWeight: "700",
    fontSize: 14,
  },
  addFav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  addFavText: {
    color: "#4DA3FF",
    fontWeight: "600",
    fontSize: 14,
  },
});
