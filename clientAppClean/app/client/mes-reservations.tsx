import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { router } from "expo-router";
import { getMesReservations } from "../../lib/api";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showMap, setShowMap] = useState(false);

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

  // Filtrer les réservations
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
    setSelectedReservation(reservation);
    setShowMap(true);
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
                  {item.chauffeur_lat && item.chauffeur_lng && (
                    <TouchableOpacity 
                      style={styles.locationButton}
                      onPress={() => handleSeeLocation(item)}
                    >
                      <Ionicons name="location-outline" size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Voir position</Text>
                    </TouchableOpacity>
                  )}
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

      {/* Modal carte */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Position du véhicule</Text>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          {selectedReservation && selectedReservation.chauffeur_lat && selectedReservation.chauffeur_lng && (
            <MapView
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: selectedReservation.chauffeur_lat,
                longitude: selectedReservation.chauffeur_lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: selectedReservation.chauffeur_lat,
                  longitude: selectedReservation.chauffeur_lng,
                }}
                title={selectedReservation.vehicle_type || "Véhicule"}
                description={`${selectedReservation.chauffeur_prenom} ${selectedReservation.chauffeur_nom}`}
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="car" size={30} color="#2563EB" />
                </View>
              </Marker>
            </MapView>
          )}
          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterText}>
              {selectedReservation?.chauffeur_prenom} {selectedReservation?.chauffeur_nom}
            </Text>
            <Text style={styles.modalFooterSubtext}>
              {selectedReservation?.vehicle_type} - {selectedReservation?.vehicle_plate}
            </Text>
          </View>
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#0B132B",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1C2541",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 4,
  },
  modalFooter: {
    padding: 16,
    backgroundColor: "#1C2541",
    alignItems: "center",
  },
  modalFooterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  modalFooterSubtext: {
    color: "#9AA4BF",
    fontSize: 12,
    marginTop: 4,
  },
});