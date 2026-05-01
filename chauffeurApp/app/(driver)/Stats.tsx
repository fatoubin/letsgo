import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverStats, getDriverHistory, API_URL, getToken, fetchWithAuth } from "../../src/services/api";

const { width } = Dimensions.get("window");

type Stats = {
  total_trips: number;
};

type HistoryItem = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
  prix?: number;
  status?: string;
  completed_at?: string;
};

export default function DriverStatsScreen() {
  const [driverId, setDriverId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const weekDays = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
  
  // Données réelles pour le graphique
  const [weeklyRevenue, setWeeklyRevenue] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    const init = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (!stored) { 
        setLoading(false); 
        return; 
      }
      const id = Number(stored);
      setDriverId(id);
      await loadStats(id);
      await loadRevenueData(id);
    };
    init();
  }, []);

  // Charger les stats de base
  const loadStats = async (id: number) => {
    try {
      const statsData = await getDriverStats(id);
      console.log("📥 STATS =", JSON.stringify(statsData));
      if (statsData) setStats(statsData);
      
      const historyData = await getDriverHistory(id);
      console.log("📥 HISTORY =", JSON.stringify(historyData));
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (e) {
      console.log("❌ DRIVER STATS ERROR", e);
    }
  };

  // Charger les données de revenus réelles depuis le backend
  const loadRevenueData = async (id: number) => {
    try {
      const token = await getToken();
      if (!token) return;

      // Récupérer toutes les données de revenus
      const response = await fetch(`${API_URL}/api/driver/revenue/all?driver_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("📥 REVENUE DATA =", JSON.stringify(data));
        
        if (data.weekly) setWeeklyRevenue(data.weekly);
        if (data.monthly) setMonthlyRevenue(data.monthly);
        if (data.total !== undefined) setTotalRevenue(data.total);
      }
    } catch (e) {
      console.log("❌ Erreur chargement revenus:", e);
      // Fallback: calculer à partir de l'historique
      calculateRevenueFromHistory();
    } finally {
      setLoading(false);
    }
  };

  // Calculer les revenus à partir de l'historique (fallback)
  const calculateRevenueFromHistory = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Initialiser les tableaux
    const weekRev = [0, 0, 0, 0, 0, 0, 0];
    const monthRev = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let total = 0;
    
    // Filtrer les trajets terminés
    const completedTrips = history.filter(trip => trip.status === "completed");
    
    completedTrips.forEach(trip => {
      const tripDate = new Date(trip.heure);
      const tripYear = tripDate.getFullYear();
      const tripMonth = tripDate.getMonth();
      const tripDay = tripDate.getDay(); // 0-6 (dimanche=0)
      
      // Revenus du mois (année en cours)
      if (tripYear === currentYear && tripMonth === currentMonth) {
        const dayIndex = tripDay === 0 ? 6 : tripDay - 1; // Convertir pour commencer lundi
        if (dayIndex >= 0 && dayIndex < 7) {
          weekRev[dayIndex] += trip.prix || 0;
        }
      }
      
      // Revenus par mois
      if (tripYear === currentYear) {
        monthRev[tripMonth] += trip.prix || 0;
      }
      
      total += trip.prix || 0;
    });
    
    setWeeklyRevenue(weekRev);
    setMonthlyRevenue(monthRev);
    setTotalRevenue(total);
  };

  const getStatusLabel = (status?: string) => {
    if (status === "completed") return { label: "Terminé", color: "#6B7280", icon: "✅" };
    return { label: "Actif", color: COLORS.success, icon: "🔄" };
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR") + " FCFA";
  };

  const getMaxValue = () => {
    const data = period === "week" ? weeklyRevenue : monthlyRevenue.slice(0, 7);
    return Math.max(...data, 1000);
  };

  const getBarHeight = (value: number) => {
    const maxValue = getMaxValue();
    return (value / maxValue) * 80;
  };

  const getCurrentPeriodData = () => {
    if (period === "week") {
      return weeklyRevenue;
    } else {
      const now = new Date();
      const currentMonth = now.getMonth();
      return monthlyRevenue.slice(0, currentMonth + 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des statistiques...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={globalStyles.screen}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.title}>Statistiques</Text>

      {/* Cartes statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.total_trips ?? 0}</Text>
          <Text style={styles.statLabel}>TRAJETS TERMINÉS</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{history.length}</Text>
          <Text style={styles.statLabel}>HISTORIQUE TOTAL</Text>
        </View>
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === "week" && styles.periodButtonActive]}
          onPress={() => setPeriod("week")}
        >
          <Text style={[styles.periodText, period === "week" && styles.periodTextActive]}>Semaine</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === "month" && styles.periodButtonActive]}
          onPress={() => setPeriod("month")}
        >
          <Text style={[styles.periodText, period === "month" && styles.periodTextActive]}>Mois</Text>
        </TouchableOpacity>
      </View>

      {/* Revenus de la période */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueTitle}>Revenus de la période</Text>
        <Text style={styles.revenueTotal}>Total: {formatPrice(totalRevenue)}</Text>
        <Text style={styles.revenueNote}>Basé sur les {stats?.total_trips ?? 0} trajets terminés</Text>

        {/* Graphique en barres */}
        <View style={styles.chartContainer}>
          {getCurrentPeriodData().map((value, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View style={[styles.bar, { height: getBarHeight(value) }]} />
              </View>
              <Text style={styles.barLabel}>
                {period === "week" ? weekDays[index] : `${index + 1}`}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Historique des trajets */}
      <Text style={styles.sectionTitle}>Historique des trajets</Text>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun trajet pour le moment</Text>
        </View>
      ) : (
        <FlatList
          data={history.filter(item => item.status === "completed")}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const status = getStatusLabel(item.status);
            return (
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyRoute}>
                    {item.depart} → {item.destination}
                  </Text>
                  <Text style={[styles.historyPrice, styles.activePrice]}>
                    {formatPrice(item.prix || 0)}
                  </Text>
                </View>
                
                <View style={styles.historyRow}>
                  <Text style={[styles.historyStatus, { color: status.color }]}>
                    {status.icon} {status.label}
                  </Text>
                </View>

                <Text style={styles.historyMeta}>🕐 {item.heure}</Text>
                <Text style={styles.historyMeta}>💺 {item.places} place(s)</Text>
              </View>
            );
          }}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}
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
  loadingText: { marginTop: 10, color: COLORS.textMuted },
  scrollContent: { paddingBottom: 40 },
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
    fontWeight: "700",
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
    padding: 20,
    width: "48%",
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  periodButtonActive: { backgroundColor: COLORS.primary },
  periodText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  periodTextActive: { color: "#fff" },
  revenueCard: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  revenueTitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 4 },
  revenueTotal: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 4 },
  revenueNote: { fontSize: 11, color: COLORS.textMuted, marginBottom: 20 },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    marginTop: 10,
  },
  barWrapper: { alignItems: "center", width: 35 },
  barContainer: { height: 80, justifyContent: "flex-end", marginBottom: 8 },
  bar: { width: 24, backgroundColor: COLORS.primary, borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: "center" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textLight,
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  historyCard: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyRoute: { fontSize: 16, fontWeight: "600", color: "#fff", flex: 1 },
  historyPrice: { fontSize: 16, fontWeight: "700", color: "#6B7280" },
  activePrice: { color: COLORS.primary },
  historyRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  historyStatus: { fontSize: 13, fontWeight: "500" },
  historyMeta: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, marginBottom: 16 },
});