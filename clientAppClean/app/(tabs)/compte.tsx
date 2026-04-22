import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getUser, logout } from "../../lib/api";

export default function CompteScreen() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      setUser(u);
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const initiales = user
    ? (user.prenom?.[0] || "") + (user.nom?.[0] || "")
    : "?";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Mon Compte</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* AVATAR + NOM */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initiales.toUpperCase()}</Text>
          </View>
          <Text style={styles.profileName}>
            {user ? `${user.prenom} ${user.nom}` : "Chargement..."}
          </Text>
          <Text style={styles.profileEmail}>{user?.email || ""}</Text>
        </View>

        {/* INFOS */}
        <Text style={styles.sectionLabel}>Informations</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#4DA3FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Prénom</Text>
              <Text style={styles.infoValue}>{user?.prenom || "—"}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={18} color="#4DA3FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{user?.nom || "—"}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#4DA3FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || "—"}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#4DA3FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{user?.telephone || "—"}</Text>
            </View>
          </View>
          <View style={styles.separator} />
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="location-outline" size={18} color="#4DA3FF" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Résidence</Text>
              <Text style={styles.infoValue}>{user?.residence || "—"}</Text>
            </View>
          </View>
        </View>

        {/* ACTIONS */}
        <Text style={styles.sectionLabel}>Activité</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/client/mes-planifications")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#0D2040" }]}>
              <Ionicons name="calendar-outline" size={18} color="#4DA3FF" />
            </View>
            <Text style={styles.actionText}>Mes planifications</Text>
            <Ionicons name="chevron-forward" size={16} color="#2A3A5A" />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/client/mes-reservations")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#0D3D2E" }]}>
              <Ionicons name="bookmark-outline" size={18} color="#3DDC97" />
            </View>
            <Text style={styles.actionText}>Mes réservations</Text>
            <Ionicons name="chevron-forward" size={16} color="#2A3A5A" />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => router.push("/client/mes-reservations-interurbaines")}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#2C1F00" }]}>
              <Ionicons name="bus-outline" size={18} color="#FFC107" />
            </View>
            <Text style={styles.actionText}>Réservations interurbaines</Text>
            <Ionicons name="chevron-forward" size={16} color="#2A3A5A" />
          </TouchableOpacity>
        </View>

        {/* DÉCONNEXION */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#ff6b6b" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>

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
  },
  profileCard: {
    alignItems: "center",
    paddingVertical: 24,
    marginHorizontal: 16,
    backgroundColor: "#0F1C3A",
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#1A4ED8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  profileName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    color: "#5A6A8A",
    fontSize: 13,
  },
  sectionLabel: {
    color: "#8899BB",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginHorizontal: 16,
  },
  card: {
    backgroundColor: "#0F1C3A",
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1A2B4A",
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: "#5A6A8A",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    backgroundColor: "#152040",
    marginHorizontal: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    color: "#CBD5E8",
    fontSize: 14,
    fontWeight: "500",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#1A0A0A",
    borderWidth: 1,
    borderColor: "#ff6b6b33",
  },
  logoutText: {
    color: "#ff6b6b",
    fontSize: 15,
    fontWeight: "700",
  },
});
