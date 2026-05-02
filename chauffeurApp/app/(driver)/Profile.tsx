import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { fetchWithAuth } from "../../src/services/api";

type Driver = {
  id?: number;
  nom?: string;
  prenom?: string;
  telephone?: string;
  residence?: string;
  email?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  seats?: number;
  license_number?: string;
  is_online?: boolean;
  latitude?: number;
  longitude?: number;
};

type Stats = {
  total_trips: number;
  TotalRevenue?: number;
  average_rating?: number;
};

export default function DriverProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const driverId = Number(params?.driverId);

  const [driver, setDriver] = useState<Driver | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId || isNaN(driverId)) {
      console.log("❌ driverId invalide:", driverId);
      setLoading(false);
      return;
    }
    loadProfile();
    loadStats();
  }, [driverId]);

  const loadProfile = async () => {
    try {
      const data = await fetchWithAuth(`/api/driver/profile?driver_id=${driverId}`);
      console.log("📥 Profil chargé:", data);
      setDriver(data);
    } catch (e) {
      console.log("PROFILE ERROR", e);
      Alert.alert("Erreur", "Impossible de charger le profil");
    }
  };

  const loadStats = async () => {
    try {
      const data = await fetchWithAuth(`/api/driver/stats?driver_id=${driverId}`);
      console.log("📥 Stats chargées:", data);
      setStats(data);
    } catch (e) {
      console.log("STATS ERROR", e);
      setStats({ total_trips: 0, TotalRevenue: 0, average_rating: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            await SecureStore.deleteItemAsync("token");
            await SecureStore.deleteItemAsync("user");
            await SecureStore.deleteItemAsync("driverId");
            router.replace("/(auth)/welcome");
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    if (!driverId || isNaN(driverId)) {
      Alert.alert("Erreur", "Chauffeur non identifié");
      return;
    }
    console.log("📱 Navigation vers EditProfile - driverId:", driverId);
    router.push({
      pathname: "/(driver)/EditProfile",
      params: { driverId: driverId.toString() }
    });
  };

  const getStatusText = (isOnline?: boolean) => {
    if (isOnline) return { label: "En ligne", color: "#10B981", icon: "●" };
    return { label: "Hors ligne", color: "#6B7280", icon: "○" };
  };

  const status = getStatusText(driver?.is_online);
  const fullname = `${driver?.prenom || ""} ${driver?.nom || ""}`.trim();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Profil chauffeur introuvable</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={globalStyles.screen} showsVerticalScrollIndicator={false}>
      {/* Header avec avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {driver?.prenom?.charAt(0) || "C"}
              {driver?.nom?.charAt(0) || ""}
            </Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        </View>
        <Text style={styles.name}>{fullname || "Chauffeur"}</Text>
        <Text style={styles.email}>{driver?.email || "Email non renseigné"}</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.icon} {status.label}
          </Text>
        </View>
      </View>

      {/* Carte Informations personnelles */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👤 Informations personnelles</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Téléphone</Text>
          <Text style={styles.value}>{driver?.telephone || "Non défini"}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Adresse</Text>
          <Text style={styles.value}>{driver?.residence || "Non défini"}</Text>
        </View>
      </View>

      {/* Carte Véhicule */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🚗 Véhicule</Text>
        </View>

        <View style={styles.vehicleHeader}>
          <Text style={styles.vehicleIcon}>🚙</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleName}>{driver?.vehicle_type || "Type non défini"}</Text>
            <Text style={styles.vehiclePlate}>{driver?.vehicle_plate || "Plaque non définie"}</Text>
          </View>
          <View style={styles.seatsBadge}>
            <Text style={styles.seatsBadgeText}>💺 {driver?.seats || "?"} places</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Numéro de permis</Text>
          <Text style={styles.value}>{driver?.license_number || "Non renseigné"}</Text>
        </View>
      </View>

      {/* Carte Statistiques (avec vraies données) */}
<View style={styles.statsContainer}>
  <View style={styles.statCard}>
    <Text style={styles.statNumber}>{stats?.total_trips || 0}</Text>
    <Text style={styles.statLabel}>Courses</Text>
  </View>
  <View style={styles.statCard}>
    <Text style={styles.statNumber}>{stats?.average_rating?.toFixed(1) || "4.9"}</Text>
    <Text style={styles.statLabel}>⭐ Note</Text>
  </View>
  <View style={styles.statCard}>
    <Text style={styles.statNumber}>
      {stats?.TotalRevenue ? stats.TotalRevenue.toLocaleString("fr-FR") : "0"} FCFA
    </Text>
    <Text style={styles.statLabel}>Gains totaux</Text>
  </View>
</View>

      {/* Boutons d'action */}
      <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
        <Text style={styles.editProfileButtonText}>✏️ Modifier le profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>🚪 Déconnexion</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Let'sGo version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
  },
  errorText: {
    color: COLORS.textLight,
    marginBottom: 20,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#1F2937",
    marginBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
  },
  statusDot: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  value: {
    fontSize: 15,
    fontWeight: "500",
    color: "#fff",
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  vehiclePlate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  seatsBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  seatsBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  editProfileButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  editProfileButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#374151",
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButtonText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 16,
  },
  versionText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 30,
  },
});