import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView
} from "react-native";

import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverTrips } from "../../src/services/api";

type Trip = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
  prix: number;
  status?: string;
};

export default function DriverTripsScreen() {

  const router = useRouter();
  const [driverName, setDriverName] = useState<string>("Chauffeur");

  const [driverId, setDriverId] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [averageRating, setAverageRating] = useState(4.9);

  useEffect(() => {
    const init = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      const user = await SecureStore.getItemAsync("user");
      
      if (user) {
        try {
          const userData = JSON.parse(user);
          if (userData.prenom) setDriverName(userData.prenom);
        } catch (e) {}
      }
      
      if (!stored) {
        Alert.alert("Erreur", "Chauffeur non identifié");
        setLoading(false);
        return;
      }
      const id = Number(stored);
      setDriverId(id);
      await fetchTrips(id);
      await fetchStats(id);
    };
    init();
  }, []);

  const fetchTrips = async (id: number) => {
    try {
      const data = await getDriverTrips(id);
      console.log("📥 TRIPS =", JSON.stringify(data));
      setTrips(Array.isArray(data) ? data : []);
      
      // Calculer les revenus du mois
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthlyTotal = (Array.isArray(data) ? data : []).reduce((sum, trip) => {
        if (trip.status === "completed") {
          return sum + (trip.prix || 0);
        }
        return sum;
      }, 0);
      setMonthlyRevenue(monthlyTotal);
      
    } catch (e) {
      console.log("❌ DRIVER TRIPS ERROR", e);
      Alert.alert("Erreur", "Impossible de charger les trajets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async (id: number) => {
    try {
      // Récupérer la note moyenne depuis le backend
      // const ratingData = await getDriverRating(id);
      // if (ratingData) setAverageRating(ratingData.average);
    } catch (e) {
      console.log("❌ Erreur récupération note:", e);
    }
  };

  const handleRefresh = () => {
    if (!driverId) return;
    setRefreshing(true);
    fetchTrips(driverId);
    fetchStats(driverId);
  };

  const getStatus = (trip: Trip) => {
    if (trip.status === "completed") return { label: "Terminé", color: "#6B7280", icon: "✓" };
    if (trip.status === "cancelled") return { label: "Annulé", color: "#EF4444", icon: "✗" };
    return { label: "Actif", color: COLORS.success, icon: "●" };
  };

  const renderTrip = ({ item }: { item: Trip }) => {
    const status = getStatus(item);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push({
          pathname: "/(driver)/TripDetails",
          params: { trip: JSON.stringify(item) }
        })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.route}>
            {item.depart} → {item.destination}
          </Text>
          <Text style={[styles.status, { color: status.color }]}>
            {status.icon} {status.label}
          </Text>
        </View>

        <Text style={styles.meta}>
          🕐 {item.heure}
        </Text>

        <Text style={styles.meta}>
          💺 {item.places} place(s)
        </Text>

        <Text style={styles.meta}>
          💰 {item.prix?.toLocaleString("fr-FR") || 0} FCFA
        </Text>

        {/* Bouton Voir les passagers (uniquement pour trajets actifs) */}
        {item.status !== "completed" && item.status !== "cancelled" && (
          <TouchableOpacity
            style={styles.passengersButton}
            onPress={() => {
              router.push({
                pathname: "/(driver)/TripReservations",
                params: { tripId: item.id }
              });
            }}
          >
            <Text style={styles.passengersButtonText}>👥 Voir les passagers</Text>
          </TouchableOpacity>
        )}
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
    <ScrollView 
      style={globalStyles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* En-tête avec message personnalisé */}
      <View style={styles.header}>
        <Text style={styles.title}>Mes trajets</Text>
        <Text style={styles.greeting}>
          Bonne route, {driverName}! 👋
        </Text>
        <Text style={styles.warningText}>
          Soyez prudents sur l'autoroute.
        </Text>
      </View>

      {/* Cartes de statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{monthlyRevenue.toLocaleString("fr-FR")} FCFA</Text>
          <Text style={styles.statLabel}>Revenus (mois)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{averageRating.toFixed(1)}/5</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
          <View style={styles.stars}>
            {"★".repeat(Math.floor(averageRating))}
            {"☆".repeat(5 - Math.floor(averageRating))}
          </View>
        </View>
      </View>

      {/* Liste des trajets */}
      <Text style={styles.sectionTitle}>Trajets récents</Text>

      {trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun trajet publié pour le moment</Text>
          <TouchableOpacity 
            style={styles.addTripButton}
            onPress={() => router.push("/(driver)/Create-Trip")}
          >
            <Text style={styles.addTripButtonText}>+ Publier un trajet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTrip}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <View style={{ height: 40 }} />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    marginBottom: 12,
    fontWeight: "700",
  },
  greeting: {
    fontSize: 18,
    color: COLORS.textLight,
    fontWeight: "600",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    width: "48%",
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  stars: {
    fontSize: 12,
    color: "#FBBF24",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  route: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  passengersButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  passengersButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  addTripButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addTripButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
