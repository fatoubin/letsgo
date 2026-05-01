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
import { getDriverTrips, expiredTrip } from "../../src/services/api";

type Trip = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
  prix: number;
  status?: string;
  completed_at?: string;
};

type TabType = "upcoming" | "ongoing" | "completed";

export default function DriverTripsScreen() {

  const router = useRouter();
  const [driverName, setDriverName] = useState<string>("Chauffeur");

  const [driverId, setDriverId] = useState<number | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("ongoing");
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
      await checkExpiredTrips(id);
    };
    init();
  }, []);

  // Remplacer la fonction checkExpiredTrips

const checkExpiredTrips = async (id: number) => {
  try {
    const response = await expiredTrip(id);
    if (response && response.success && response.expired_count > 0) {
      console.log(`🗑️ ${response.expired_count} trajets expirés supprimés`);
      await fetchTrips(id);
    } else if (response && !response.success) {
      console.log("⚠️ Erreur lors de la vérification des trajets expirés:", response.error);
    }
  } catch (error) {
    console.log("Erreur vérification trajets expirés:", error);
    // Ne pas afficher d'alerte à l'utilisateur pour cette erreur
  }
};

  // Dans TripScreen.tsx, assurez-vous que la fonction fetchTrips récupère bien les données
const fetchTrips = async (id: number) => {
  try {
    const data = await getDriverTrips(id);
    console.log("📥 TRIPS =", JSON.stringify(data));
    
    // S'assurer que data est un tableau
    const tripsData = Array.isArray(data) ? data : [];
    setAllTrips(tripsData);
    
    // Calculer les revenus du mois (uniquement trajets terminés)
    const monthlyTotal = tripsData.reduce((sum, trip) => {
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

  const handleRefresh = async () => {
    if (!driverId) return;
    setRefreshing(true);
    await fetchTrips(driverId);
    await checkExpiredTrips(driverId);
  };

  // Déterminer la catégorie d'un trajet
  const getTripCategory = (trip: Trip): TabType => {
    if (trip.status === "completed") return "completed";
    
    const now = new Date();
    const tripDate = new Date(trip.heure);
    const hoursDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Moins de 24h restantes = En cours
    if (hoursDiff <= 24 && hoursDiff > 0) {
      return "ongoing";
    }
    // Plus de 24h = À venir
    if (hoursDiff > 24) {
      return "upcoming";
    }
    // Date dépassée = trajet expiré (ne doit pas apparaître)
    return "completed"; // Sera filtré par l'API
  };

  // Filtrer les trajets par catégorie
  const getUpcomingTrips = () => {
    const now = new Date();
    return allTrips.filter(trip => {
      if (trip.status === "completed" || trip.status === "cancelled") return false;
      const tripDate = new Date(trip.heure);
      const hoursDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    });
  };

  const getOngoingTrips = () => {
    const now = new Date();
    return allTrips.filter(trip => {
      if (trip.status === "completed" || trip.status === "cancelled") return false;
      const tripDate = new Date(trip.heure);
      const hoursDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 24 && hoursDiff > 0;
    });
  };

  const getCompletedTrips = () => {
    return allTrips.filter(trip => trip.status === "completed");
  };

  const getCurrentTrips = () => {
    switch (activeTab) {
      case "upcoming": return getUpcomingTrips();
      case "ongoing": return getOngoingTrips();
      case "completed": return getCompletedTrips();
      default: return [];
    }
  };

  const getStatus = (trip: Trip) => {
    if (trip.status === "completed") return { label: "Terminé", color: "#6B7280", bgColor: "#374151" };
    if (trip.status === "cancelled") return { label: "Annulé", color: "#EF4444", bgColor: "#7F1D1D" };
    
    const now = new Date();
    const tripDate = new Date(trip.heure);
    const hoursDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return { label: "À venir", color: "#F59E0B", bgColor: "#451A03" };
    }
    if (hoursDiff <= 24 && hoursDiff > 0) {
      return { label: "En cours", color: COLORS.success, bgColor: "#064E3B" };
    }
    // Date dépassée
    return { label: "Expiré", color: "#6B7280", bgColor: "#374151" };
  };

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case "upcoming": return getUpcomingTrips().length;
      case "ongoing": return getOngoingTrips().length;
      case "completed": return getCompletedTrips().length;
      default: return 0;
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "ongoing" && styles.tabActive]}
        onPress={() => setActiveTab("ongoing")}
      >
        <Text style={[styles.tabText, activeTab === "ongoing" && styles.tabTextActive]}>
          En cours ({getTabCount("ongoing")})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === "upcoming" && styles.tabActive]}
        onPress={() => setActiveTab("upcoming")}
      >
        <Text style={[styles.tabText, activeTab === "upcoming" && styles.tabTextActive]}>
          À venir ({getTabCount("upcoming")})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === "completed" && styles.tabActive]}
        onPress={() => setActiveTab("completed")}
      >
        <Text style={[styles.tabText, activeTab === "completed" && styles.tabTextActive]}>
          Terminés ({getTabCount("completed")})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderTrip = ({ item }: { item: Trip }) => {
    const status = getStatus(item);
    const isCompleted = item.status === "completed";
    const isExpired = status.label === "Expiré";
    const isUpcoming = status.label === "À venir";

    // Ne pas afficher les trajets expirés dans les listes actives
    if (isExpired && activeTab !== "completed") return null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (isCompleted || isExpired) {
            router.push({
              pathname: "/(driver)/TripDetails",
              params: { trip: JSON.stringify(item) }
            });
          } else {
            router.push({
              pathname: "/(driver)/TripDetails",
              params: { trip: JSON.stringify(item) }
            });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.route}>
            {item.depart} → {item.destination}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <Text style={styles.meta}>
          🕐 {new Date(item.heure).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}
        </Text>

        <Text style={styles.meta}>
          💺 {item.places} place(s)
        </Text>

        <Text style={styles.meta}>
          💰 {item.prix?.toLocaleString("fr-FR") || 0} FCFA
        </Text>

        {/* Bouton Voir les passagers (uniquement pour trajets actifs ou à venir, non expirés) */}
        {!isCompleted && !isExpired && (
          <TouchableOpacity
            style={styles.passengersButton}
            onPress={() => {
              router.push({
                pathname: "/(driver)/Reservations",
                params: { tripId: item.id }
              });
            }}
          >
            <Text style={styles.passengersButtonText}>
              {isUpcoming ? "📋 Gérer les réservations" : "👥 Voir les passagers"}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const currentTrips = getCurrentTrips();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>
      <ScrollView 
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
          </View>
        </View>

        {/* Barre d'onglets */}
        {renderTabBar()}

        {/* Liste des trajets */}
        {currentTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === "ongoing" && "Aucun trajet en cours"}
              {activeTab === "upcoming" && "Aucun trajet à venir"}
              {activeTab === "completed" && "Aucun trajet terminé"}
            </Text>
            {activeTab !== "completed" && (
              <TouchableOpacity 
                style={styles.addTripButton}
                onPress={() => router.push("/(driver)/Create-Trip")}
              >
                <Text style={styles.addTripButtonText}>+ Publier un trajet</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={currentTrips}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderTrip}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
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
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: "#fff",
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
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  meta: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  passengersButton: {
    marginTop: 12,
    backgroundColor: "#3B82F6",
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