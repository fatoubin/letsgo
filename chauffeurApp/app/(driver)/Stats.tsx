import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator
} from "react-native";

import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverStats, getDriverHistory } from "../../src/services/api";

type Stats = {
  total_trips: number;
};

type HistoryItem = {
  id: number;
  depart: string;
  destination: string;
  heure: string;
  places: number;
};

export default function DriverStatsScreen() {

  const [driverId, setDriverId] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

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
      // ── Stats ──
      const statsData = await getDriverStats(id);
      console.log("📥 STATS =", JSON.stringify(statsData));
      if (statsData) setStats(statsData);

      // ── Historique ──
      const historyData = await getDriverHistory(id);
      console.log("📥 HISTORY =", JSON.stringify(historyData));
      setHistory(Array.isArray(historyData) ? historyData : []);

    } catch (e) {
      console.log("❌ DRIVER STATS ERROR", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.textMuted }}>
          Chargement des statistiques...
        </Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted }}>
          Impossible de charger les statistiques
        </Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Statistiques</Text>

      {/* ── Stats ── */}
      <View style={styles.statsRow}>
        <Stat label="Trajets totaux" value={stats.total_trips ?? 0} />
        <Stat label="Historique" value={history.length} />
      </View>

      {/* ── Historique ── */}
      <Text style={styles.subtitle}>Historique des trajets</Text>

      {history.length === 0 ? (
        <Text style={styles.empty}>Aucun trajet pour le moment</Text>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.route}>
                {item.depart} → {item.destination}
              </Text>
              <Text style={styles.meta}>🕐 {item.heure}</Text>
              <Text style={styles.meta}>💺 {item.places} place(s)</Text>
            </View>
          )}
        />
      )}

    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  subtitle: {
    fontSize: 18,
    marginTop: 30,
    marginBottom: 10,
    color: COLORS.textLight,
    fontWeight: "600"
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14
  },
  statBox: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 20,
    width: "48%",
    alignItems: "center"
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff"
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12
  },
  route: {
    fontWeight: "600",
    marginBottom: 6,
    color: "#fff",
    fontSize: 15
  },
  meta: {
    color: COLORS.textMuted,
    marginTop: 2
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: COLORS.textMuted
  }
});