import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";

import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverTrips } from "../../src/services/api";

export default function DriverTripsScreen() {

  const router = useRouter();

  const [driverId, setDriverId] = useState<number | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (!stored) {
        Alert.alert("Erreur", "Chauffeur non identifié");
        setLoading(false);
        return;
      }
      const id = Number(stored);
      setDriverId(id);
      await fetchTrips(id);
    };
    init();
  }, []);

  const fetchTrips = async (id: number) => {
    try {
      const data = await getDriverTrips(id);
      console.log("📥 TRIPS =", JSON.stringify(data));
      setTrips(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("❌ DRIVER TRIPS ERROR", e);
      Alert.alert("Erreur", "Impossible de charger les trajets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    if (!driverId) return;
    setRefreshing(true);
    fetchTrips(driverId);
  };

  const getStatus = (trip: any) => {
    if (trip.status === "completed") return { label: "Terminé", color: "#6B7280" };
    if (trip.status === "cancelled") return { label: "Annulé", color: "#EF4444" };
    return { label: "Actif", color: COLORS.success };
  };

  const renderTrip = ({ item }: any) => {
    const status = getStatus(item);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({
          pathname: "/(driver)/trip-detail",
          params: { trip: JSON.stringify(item) }
        })}
      >
        {/* Champs du backend : depart, destination, heure, places */}
        <Text style={styles.route}>
          {item.depart} → {item.destination}
        </Text>

        <Text style={styles.meta}>
          🕐 {item.heure}
        </Text>

        <Text style={styles.meta}>
          💺 {item.places} place(s)
        </Text>

        <Text style={[styles.status, { color: status.color }]}>
          ● {status.label}
        </Text>

      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Mes trajets</Text>

      <FlatList
        data={trips}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTrip}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Aucun trajet publié pour le moment</Text>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14
  },
  route: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    color: "#fff"
  },
  meta: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4
  },
  status: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600"
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: COLORS.textMuted,
    fontSize: 16
  }
});