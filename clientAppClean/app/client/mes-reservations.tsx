import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { getMesReservations, annulerReservation } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";

type Reservation = {
  id: number;
  places: number;
  prix: number;
  created_at: string;
  depart: string;
  destination: string;
  heure: string;
  conducteur_nom: string;
  conducteur_prenom: string;
};

export default function MesReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getMesReservations();
      console.log("📋 Réservations reçues:", data);
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

  const handleAnnuler = (reservation: Reservation) => {
    Alert.alert(
      "Annuler la réservation",
      `Voulez-vous vraiment annuler votre réservation pour ${reservation.depart} → ${reservation.destination} ?`,
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            try {
              await annulerReservation(reservation.id);
              Alert.alert("Succès", "Réservation annulée");
              loadReservations(); // Recharge la liste
            } catch (error) {
              Alert.alert("Erreur", "Impossible d'annuler la réservation");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (reservations.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="bookmark-outline" size={64} color="#4B5563" />
        <Text style={styles.emptyTitle}>Aucune réservation</Text>
        <Text style={styles.emptyText}>
          Vous n'avez pas encore réservé de trajet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* En-tête avec trajet */}
            <View style={styles.routeHeader}>
              <View style={styles.routeIcon}>
                <Ionicons name="swap-horizontal" size={20} color="#4DA3FF" />
              </View>
              <Text style={styles.routeText}>
                {item.depart} → {item.destination}
              </Text>
            </View>

            {/* Date et heure */}
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#9AA4BF" />
              <Text style={styles.infoText}>{formatDate(item.heure)}</Text>
            </View>

            {/* Conducteur */}
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#9AA4BF" />
              <Text style={styles.infoText}>
                Conducteur : {item.conducteur_prenom} {item.conducteur_nom}
              </Text>
            </View>

            {/* Places et prix */}
            <View style={styles.footerRow}>
              <View style={styles.placesBadge}>
                <Ionicons name="people-outline" size={14} color="#fff" />
                <Text style={styles.placesText}>{item.places} place(s)</Text>
              </View>
              <Text style={styles.prixText}>{item.prix?.toLocaleString()} FCFA</Text>
            </View>

            {/* Boutons d'action */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => handleAnnuler(item)}
              >
                <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
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
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B132B",
  },
  loadingText: {
    color: "#9AA4BF",
    marginTop: 12,
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
    marginTop: 8,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#1C2541",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  routeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    color: "#9AA4BF",
    fontSize: 14,
    marginLeft: 10,
  },
  footerRow: {
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  placesText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 6,
  },
  prixText: {
    color: "#4ADE80",
    fontSize: 16,
    fontWeight: "bold",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF444420",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  cancelButtonText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "500",
  },
});