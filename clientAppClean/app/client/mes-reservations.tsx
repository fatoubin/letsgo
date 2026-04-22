import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Linking } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { router } from "expo-router";
import { getMesReservations, annulerReservation } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";

type Reservation = {
  id: number;
  places: number;
  prix: number;
  created_at: string;
  reservation_status: string;
  trip_id: number;
  depart: string;
  destination: string;
  heure: string;
  chauffeur_id: number;
  chauffeur_nom: string;
  chauffeur_prenom: string;
  chauffeur_telephone: string;
  vehicle_type: string;
  vehicle_plate: string;
  chauffeur_lat: number;
  chauffeur_lng: number;
  is_online: boolean;
};

type Filtre = "TOUTES" | "accepted" | "rejected" | "pending";

export default function MesReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("TOUTES");

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getMesReservations();
      setReservations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de charger vos réservations");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReservations();
    }, [])
  );

  const applyFilter = useCallback(() => {
    if (filtre === "TOUTES") {
      setFilteredReservations(reservations);
    } else {
      setFilteredReservations(reservations.filter(r => r.reservation_status === filtre));
    }
  }, [reservations, filtre]);

  useEffect(() => {
    applyFilter();
  }, [reservations, filtre, applyFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return '✅ Acceptée';
      case 'rejected': return '❌ Refusée';
      default: return '⏳ En cours de traitement';
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleSeeLocation = (reservation: Reservation) => {
    console.log("📍 Ouverture Google Maps avec itinéraire:", { 
      lat: reservation.chauffeur_lat, 
      lng: reservation.chauffeur_lng 
    });
    
    if (reservation.chauffeur_lat && reservation.chauffeur_lng) {
      // URL pour obtenir l'itinéraire depuis la position actuelle vers le chauffeur
      const url = `https://www.google.com/maps/dir/?api=1&destination=${reservation.chauffeur_lat},${reservation.chauffeur_lng}&travelmode=driving`;
      
      Linking.openURL(url).catch(err => {
        console.error("Erreur ouverture carte:", err);
        Alert.alert("Erreur", "Impossible d'ouvrir la carte");
      });
    } else {
      Alert.alert("Info", "Position non disponible");
    }
  };

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
              loadReservations();
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes réservations</Text>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        {[
          { key: "TOUTES", label: "Toutes", color: "#6B7280" },
          { key: "pending", label: "En cours", color: "#F59E0B" },
          { key: "accepted", label: "Acceptées", color: "#10B981" },
          { key: "rejected", label: "Refusées", color: "#EF4444" },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              filtre === f.key && { backgroundColor: f.color },
            ]}
            onPress={() => setFiltre(f.key as Filtre)}
          >
            <Text style={[styles.filterText, filtre === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liste des réservations */}
      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={64} color="#4B5563" />
            <Text style={styles.emptyTitle}>Aucune réservation</Text>
            <Text style={styles.emptyText}>
              {filtre === "TOUTES" 
                ? "Vous n'avez pas encore de réservation" 
                : `Aucune réservation ${filtre === "accepted" ? "acceptée" : filtre === "rejected" ? "refusée" : "en cours"}`}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* En-tête */}
            <View style={styles.cardHeader}>
              <Text style={styles.routeText}>
                {item.depart} → {item.destination}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.reservation_status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(item.reservation_status) }]}>
                  {getStatusText(item.reservation_status)}
                </Text>
              </View>
            </View>

            {/* Date et heure */}
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={14} color="#9AA4BF" />
              <Text style={styles.infoText}>{formatDate(item.heure)}</Text>
            </View>

            {/* Places et prix */}
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color="#9AA4BF" />
              <Text style={styles.infoText}>{item.places} place(s) - {item.prix.toLocaleString()} FCFA</Text>
            </View>

            {/* Infos chauffeur (si acceptée) */}
            {item.reservation_status === 'accepted' && item.chauffeur_id && (
              <View style={styles.driverSection}>
                <Text style={styles.driverTitle}>Conducteur</Text>
                <View style={styles.driverInfo}>
                  <Ionicons name="person-outline" size={14} color="#4DA3FF" />
                  <Text style={styles.driverText}>{item.chauffeur_prenom} {item.chauffeur_nom}</Text>
                </View>
                {item.vehicle_type && (
                  <View style={styles.driverInfo}>
                    <Ionicons name="car-outline" size={14} color="#4DA3FF" />
                    <Text style={styles.driverText}>{item.vehicle_type} - {item.vehicle_plate}</Text>
                  </View>
                )}
                <View style={styles.driverActions}>
                  <TouchableOpacity 
                    style={styles.callButton}
                    onPress={() => handleCall(item.chauffeur_telephone)}
                  >
                    <Ionicons name="call-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Appeler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.locationButton}
                    onPress={() => handleSeeLocation(item)}
                  >
                    <Ionicons name="location-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Voir position</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => handleAnnuler(item)}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Message pour refusée */}
            {item.reservation_status === 'rejected' && (
              <View style={styles.rejectedMessage}>
                <Ionicons name="sad-outline" size={20} color="#EF4444" />
                <Text style={styles.rejectedText}>Votre demande a été refusée</Text>
              </View>
            )}

            {/* Message pour en cours */}
            {item.reservation_status === 'pending' && (
              <View style={styles.pendingMessage}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text style={styles.pendingText}>En attente de réponse du conducteur...</Text>
              </View>
            )}
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
  filtersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#1C2541",
  },
  filterText: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#1C2541",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  routeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    color: "#9AA4BF",
    fontSize: 12,
  },
  driverSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  driverTitle: {
    color: "#4DA3FF",
    fontSize: 12,
    marginBottom: 8,
  },
  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  driverText: {
    color: "#fff",
    fontSize: 12,
  },
  driverActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  rejectedMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  rejectedText: {
    color: "#EF4444",
    fontSize: 12,
  },
  pendingMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2A3655",
  },
  pendingText: {
    color: "#F59E0B",
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 50,
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
});