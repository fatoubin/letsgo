import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { getNotifications, marquerToutLu, marquerNotifLue } from "../../lib/api";

type Notif = {
  id: number;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  created_at: string;
};

function getIconConfig(type: string): { icon: string; color: string } {
  switch (type) {
    case "offre": return { icon: "car", color: "#4DA3FF" };
    case "acceptee": return { icon: "checkmark-circle", color: "#3DDC97" };
    case "refusee": return { icon: "close-circle", color: "#ff6b6b" };
    case "rappel": return { icon: "alarm", color: "#FFC107" };
    default: return { icon: "notifications", color: "#8899BB" };
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  if (diff < 172800) return "Hier";
  return `Il y a ${Math.floor(diff / 86400)}j`;
}

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifs = async () => {
    try {
      const data = await getNotifications();
      setNotifs(data || []);
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifs();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifs();
  }, []);

  const handleMarquerTout = async () => {
    await marquerToutLu();
    setNotifs((prev) => prev.map((n) => ({ ...n, lu: true })));
  };

  const handleMarquerLue = async (id: number) => {
    await marquerNotifLue(id);
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
    );
  };

  const nonLues = notifs.filter((n) => !n.lu).length;
  const nouvelles = notifs.filter((n) => !n.lu);
  const precedentes = notifs.filter((n) => n.lu);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {nonLues > 0 && (
            <Text style={styles.subtitle}>
              {nonLues} non lue{nonLues > 1 ? "s" : ""}
            </Text>
          )}
        </View>
        {nonLues > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={handleMarquerTout}>
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4DA3FF" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4DA3FF"
            />
          }
        >
          {notifs.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#1A2B4A" />
              <Text style={styles.emptyText}>Aucune notification</Text>
              <Text style={styles.emptySubtext}>
                Vous serez notifié quand un chauffeur répondra à vos demandes
              </Text>
            </View>
          ) : (
            <>
              {/* NON LUES */}
              {nouvelles.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Nouvelles</Text>
                  {nouvelles.map((n) => {
                    const { icon, color } = getIconConfig(n.type);
                    return (
                      <TouchableOpacity
                        key={n.id}
                        style={[styles.card, styles.cardUnread]}
                        onPress={() => handleMarquerLue(n.id)}
                      >
                        <View style={[styles.iconBadge, { backgroundColor: color + "22" }]}>
                          <Ionicons name={icon as any} size={20} color={color} />
                        </View>
                        <View style={styles.cardContent}>
                          <View style={styles.cardTop}>
                            <Text style={styles.cardTitre}>{n.titre}</Text>
                            <View style={styles.unreadDot} />
                          </View>
                          <Text style={styles.cardMessage}>{n.message}</Text>
                          <Text style={styles.cardHeure}>{formatDate(n.created_at)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* LUES */}
              {precedentes.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Précédentes</Text>
                  {precedentes.map((n) => {
                    const { icon } = getIconConfig(n.type);
                    return (
                      <TouchableOpacity key={n.id} style={styles.card}>
                        <View style={[styles.iconBadge, { backgroundColor: "#1A2B4A" }]}>
                          <Ionicons name={icon as any} size={20} color="#5A6A8A" />
                        </View>
                        <View style={styles.cardContent}>
                          <Text style={[styles.cardTitre, { color: "#8899BB" }]}>{n.titre}</Text>
                          <Text style={styles.cardMessage}>{n.message}</Text>
                          <Text style={styles.cardHeure}>{formatDate(n.created_at)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070F23" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 20,
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "800" },
  subtitle: { color: "#4DA3FF", fontSize: 13, marginTop: 2 },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#0F1C3A",
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  markAllText: { color: "#4DA3FF", fontSize: 12, fontWeight: "600" },
  loaderContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", marginTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyText: { color: "#5A6A8A", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#2A3A5A", fontSize: 13, textAlign: "center", lineHeight: 20 },
  sectionLabel: {
    color: "#8899BB",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#0F1C3A",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1A2B4A",
  },
  cardUnread: { borderColor: "#1A4ED8", backgroundColor: "#0C1830" },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitre: { color: "#fff", fontSize: 14, fontWeight: "700", flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4DA3FF",
    marginLeft: 8,
  },
  cardMessage: { color: "#5A6A8A", fontSize: 13, lineHeight: 18, marginBottom: 6 },
  cardHeure: { color: "#2A3A5A", fontSize: 11, fontWeight: "600" },
});
