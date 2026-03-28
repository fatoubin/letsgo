import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image
} from "react-native";

import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import PrimaryButton from "../../src/components/PrimaryButton";
import { getDriverProfile } from "../../src/services/api";

export default function DriverHomeScreen() {

  const router = useRouter();

  const [driver, setDriver] = useState<any>(null);
  const [driverId, setDriverId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {

        // ── Lire driverId depuis SecureStore (sauvegardé au login) ──
        const storedDriverId = await SecureStore.getItemAsync("driverId");
        const storedUser = await SecureStore.getItemAsync("user");

        console.log("storedDriverId =", storedDriverId);
        console.log("storedUser =", storedUser);

        if (!storedDriverId) {
          console.log("❌ Pas de driverId en SecureStore");
          setLoading(false);
          return;
        }

        const id = Number(storedDriverId);
        setDriverId(id);

        // ── Charger le profil depuis l'API ──
        const data = await getDriverProfile(id);
        console.log("📥 DRIVER PROFILE =", JSON.stringify(data));

        // Le backend retourne directement l'objet (pas data.driver)
        if (data) {
          setDriver(data);
        }

      } catch (e) {
        console.log("❌ DRIVER PROFILE ERROR", e);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: "#fff" }}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff", marginBottom: 20 }}>Profil chauffeur introuvable</Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/driver-login")}>
          <Text style={{ color: COLORS.primary }}>Se reconnecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Adapter les champs du backend ──
  const fullname = `${driver.prenom ?? ""} ${driver.nom ?? ""}`.trim();
  const vehicleName = driver.vehicle_type ?? "Non défini";
  const plateNumber = driver.vehicle_plate ?? "---";
  const seats = driver.seats ?? "?";

  return (
    <ScrollView style={globalStyles.screen}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(driver)/menu")}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chauffeur</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* ── Carte profil ── */}
      <View style={styles.profileCard}>
        <View style={styles.profileRow}>

          <Image
            source={require("../../assets/avatar.png")}
            style={styles.avatar}
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{fullname || "Chauffeur"}</Text>
            <Text style={styles.rating}>⭐ 4.95 (124 courses)</Text>
            <View style={[styles.statusBadge, { borderColor: COLORS.primary }]}>
              <Text style={[styles.statusText, { color: COLORS.primary }]}>
                ● COMPTE ACTIF
              </Text>
            </View>
          </View>

        </View>
      </View>

      {/* ── Carte véhicule ── */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleRow}>

          <Text style={styles.vehicleIcon}>🚗</Text>

          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleLabel}>VÉHICULE ACTUEL</Text>
            <Text style={styles.vehicleName}>{vehicleName}</Text>
            <View style={styles.vehicleMeta}>
              <Text style={styles.vehicleInfo}>{seats} Places</Text>
              <Text style={styles.vehicleInfo}>{driver.license_number ?? "?"}</Text>
            </View>
          </View>

          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{plateNumber}</Text>
          </View>

        </View>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionsRow}>

        <TouchableOpacity
          style={styles.tripCard}
          onPress={() => router.push({ pathname: "/(driver)/trips", params: { driverId } })}
        >
          <View style={styles.iconBoxBlue}>
            <Text style={styles.icon}>📍</Text>
          </View>
          <Text style={styles.tripTitle}>Mes Trajets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addCard}
          onPress={() => router.push({ pathname: "/(driver)/create-trip", params: { driverId } })}
        >
          <View style={styles.iconBoxGreen}>
            <Text style={styles.icon}>＋</Text>
          </View>
          <Text style={styles.tripTitle}>Ajouter un trajet</Text>
        </TouchableOpacity>

      </View>

      <PrimaryButton
        title="⚡ Prendre une course"
        onPress={() => router.push({ pathname: "/(driver)/requests", params: { driverId } })}
        style={styles.mainButton}
      />

      <TouchableOpacity
        style={styles.statsButton}
        onPress={() => router.push({ pathname: "/(driver)/stats", params: { driverId } })}
      >
        <Text style={styles.statsText}>📊 Statistiques & Historique</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  menuIcon: {
    fontSize: 26,
    color: COLORS.textLight
  },
  headerTitle: {
    fontSize: 22,
    color: COLORS.textLight,
    fontWeight: "600"
  },
  profileCard: {
    backgroundColor: "#1F2937",
    borderRadius: 22,
    padding: 20,
    marginBottom: 24
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 16
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff"
  },
  rating: {
    color: COLORS.textMuted,
    marginTop: 4
  },
  statusBadge: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "flex-start"
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600"
  },
  vehicleCard: {
    backgroundColor: "#1F2937",
    borderRadius: 20,
    padding: 20,
    marginBottom: 26
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  vehicleIcon: {
    fontSize: 28,
    marginRight: 14
  },
  vehicleLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4
  },
  vehicleName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600"
  },
  vehicleMeta: {
    flexDirection: "row",
    marginTop: 6
  },
  vehicleInfo: {
    color: COLORS.textMuted,
    marginRight: 16
  },
  plateBadge: {
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  plateText: {
    color: "#fff"
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 26
  },
  tripCard: {
    backgroundColor: "#1E3A8A",
    borderRadius: 20,
    padding: 22,
    width: "48%",
    alignItems: "center"
  },
  addCard: {
    backgroundColor: "#065F46",
    borderRadius: 20,
    padding: 22,
    width: "48%",
    alignItems: "center"
  },
  iconBoxBlue: {
    backgroundColor: "#3B82F6",
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  iconBoxGreen: {
    backgroundColor: "#10B981",
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12
  },
  icon: {
    fontSize: 24,
    color: "#fff"
  },
  tripTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  mainButton: {
    marginBottom: 20
  },
  statsButton: {
    backgroundColor: "#1F2937",
    borderRadius: 18,
    padding: 18,
    alignItems: "center"
  },
  statsText: {
    color: "#fff",
    fontSize: 16
  }
});