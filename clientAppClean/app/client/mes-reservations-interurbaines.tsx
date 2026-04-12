import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getMesReservationsInterurbaines } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";

type ReservationInterurbaine = {
  id: number;
  places: number;
  prix_total: number;
  statut: string;
  date_reservation: string;
  heure_depart: string;
  heure_arrivee: string;
  ville_depart: string;
  ville_arrivee: string;
  gare_depart: string;
  gare_arrivee: string;
};

export default function MesReservationsInterurbaines() {
  const [reservations, setReservations] = useState<ReservationInterurbaine[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getMesReservationsInterurbaines();
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [])
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (reservations.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="bus-outline" size={64} color="#4B5563" />
        <Text style={styles.emptyTitle}>Aucune réservation</Text>
        <Text style={styles.emptyText}>
          Vous n'avez pas encore réservé de trajet interurbain.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes réservations interurbaines</Text>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.routeHeader}>
              <Ionicons name="bus-outline" size={20} color="#4DA3FF" />
              <Text style={styles.routeText}>
                {item.ville_depart} → {item.ville_arrivee}
              </Text>
            </View>

            <View style={styles.gareInfo}>
              <Ionicons name="location-outline" size={14} color="#9AA4BF" />
              <Text style={styles.gareText}>Départ : {item.gare_depart}</Text>
            </View>

            <View style={styles.gareInfo}>
              <Ionicons name="flag-outline" size={14} color="#9AA4BF" />
              <Text style={styles.gareText}>Arrivée : {item.gare_arrivee}</Text>
            </View>

            <View style={styles.horaireInfo}>
              <Ionicons name="time-outline" size={14} color="#9AA4BF" />
              <Text style={styles.horaireText}>
                {item.heure_depart.substring(0,5)} → {item.heure_arrivee.substring(0,5)}
              </Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.placesBadge}>
                <Ionicons name="people-outline" size={12} color="#fff" />
                <Text style={styles.placesText}>{item.places} place(s)</Text>
              </View>
              <Text style={styles.prixText}>{item.prix_total.toLocaleString()} FCFA</Text>
            </View>

            <View style={styles.dateInfo}>
              <Ionicons name="calendar-outline" size={12} color="#9AA4BF" />
              <Text style={styles.dateText}>Réservé le {formatDate(item.date_reservation)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B132B",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyText: {
    color: "#9AA4BF",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#1C2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  routeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  gareInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  gareText: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  horaireInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  horaireText: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  placesBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  placesText: {
    color: "#fff",
    fontSize: 10,
  },
  prixText: {
    color: "#4ADE80",
    fontSize: 14,
    fontWeight: "bold",
  },
  dateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  dateText: {
    color: "#6B7280",
    fontSize: 10,
  },
});