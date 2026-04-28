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
import { getDriverStats, getDriverHistory, API_URL, getToken } from "../../src/services/api";

const { width } = Dimensions.get("window");

type Stats = {
  total_trips: number;
  total_revenue?: number;
  weekly_revenue?: number[];
};

type HistoryItem = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
  prix?: number;
  status?: string;
};

export default function DriverStatsScreen() {

  const [driverId, setDriverId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  // Données simulées pour le graphique
  const weeklyData = [12000, 18000, 15000, 25000, 32000, 28000, 22000];
  const monthlyData = [45000, 52000, 48000, 60000, 75000, 68000, 55000, 72000, 81000, 65000, 58000, 49000];
  const weekDays = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

  useEffect(() => {
    const init = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (!stored) { setLoading(false); return; }
      const id = Number(stored);
      setDriverId(id);
      await loadStats(id);
    };
    init();
  }, []);

  const loadStats = async (id: number) => {
    try {
      // Stats (trajets terminés)
      const statsData = await getDriverStats(id);
      console.log("📥 STATS =", JSON.stringify(statsData));
      if (statsData) {
        setStats({
          ...statsData,
          total_revenue: 150000,
          weekly_revenue: weeklyData
        });
      }

      // Historique (tous les trajets, y compris terminés)
      const historyData = await getDriverHistory(id);
      console.log("📥 HISTORY =", JSON.stringify(historyData));
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (e) {
      console.log("❌ DRIVER STATS ERROR", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status?: string) => {
    if (status === "completed") return { label: "Terminé", color: "#6B7280", icon: "✅" };
    return { label: "Actif", color: COLORS.success, icon: "🔄" };
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("fr-FR") + " FCFA";
  };

  const getMaxValue = () => {
    const data = period === "week" ? weeklyData : monthlyData.slice(0, 7);
    return Math.max(...data, 1000);
  };

  const getBarHeight = (value: number) => {
    const maxValue = getMaxValue();
    return (value / maxValue) * 80; // Hauteur max 80px
  };

  const totalRevenue = stats?.total_revenue || 
    history.reduce((sum, item) => sum + (item.prix || 0), 0);

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
      {/* Titre */}
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
          <Text style={[styles.periodText, period === "week" && styles.periodTextActive]}>
            Semaine
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === "month" && styles.periodButtonActive]}
          onPress={() => setPeriod("month")}
        >
          <Text style={[styles.periodText, period === "month" && styles.periodTextActive]}>
            Mois
          </Text>
        </TouchableOpacity>
      </View>

      {/* Revenus de la période */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueTitle}>Revenus de la période</Text>
        <Text style={styles.revenueTotal}>Total: {formatPrice(totalRevenue)}</Text>

        {/* Graphique en barres */}
        <View style={styles.chartContainer}>
          {(period === "week" ? weeklyData : monthlyData.slice(0, 7)).map((value, index) => (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { height: getBarHeight(value) }
                  ]} 
                />
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
          <TouchableOpacity style={styles.emptyButton}>
            <Text style={styles.emptyButtonText}>Rechercher un trajet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
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
                  <Text style={[styles.historyPrice, status.color === COLORS.success && styles.activePrice]}>
                    {formatPrice(item.prix || 5000)}
                  </Text>
                </View>
                
                <View style={styles.historyRow}>
                  <Text style={[styles.historyStatus, { color: status.color }]}>
                    {status.icon} {status.label}
                  </Text>
                </View>

                <Text style={styles.historyMeta}>
                  🕐 {item.heure}
                </Text>
                <Text style={styles.historyMeta}>
                  💺 {item.places} place(s)
                </Text>
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
  loadingText: {
    marginTop: 10,
    color: COLORS.textMuted,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodText: {
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 14,
  },
  periodTextActive: {
    color: "#fff",
  },
  revenueCard: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  revenueTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  revenueTotal: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 120,
    marginTop: 10,
  },
  barWrapper: {
    alignItems: "center",
    width: 35,
  },
  barContainer: {
    height: 80,
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  bar: {
    width: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: "center",
  },
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
  historyRoute: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B7280",
  },
  activePrice: {
    color: COLORS.primary,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  historyStatus: {
    fontSize: 13,
    fontWeight: "500",
  },
  historyMeta: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});