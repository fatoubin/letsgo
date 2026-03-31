import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import PrimaryButton from "../../src/components/PrimaryButton";
import { acceptReservation, rejectReservation } from "../../src/services/api";
import { API_URL } from "../../src/services/api";

type Reservation = {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  status: "pending" | "accepted" | "rejected";
};

export default function DriverTripDetailScreen() {

  const router = useRouter();
  const params = useLocalSearchParams();

  // trip passé en JSON depuis TripScreen
  const trip = params?.trip ? JSON.parse(params.trip as string) : null;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trip?.id) { setLoading(false); return; }
    fetchReservations();
  }, [trip]);

  const fetchReservations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/trips/driver_requests`, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      console.log("📥 RESERVATIONS =", JSON.stringify(data));
      setReservations(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log("❌ RESERVATIONS ERROR", e);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptReservation(id);
      Alert.alert("✅ Succès", "Réservation acceptée");
      fetchReservations();
    } catch (e) {
      Alert.alert("Erreur", "Action impossible");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectReservation(id);
      Alert.alert("Refusée", "Réservation refusée");
      fetchReservations();
    } catch (e) {
      Alert.alert("Erreur", "Action impossible");
    }
  };

  const renderStatus = (status: string) => {
    if (status === "accepted") return <Text style={[styles.statusBadge, styles.accepted]}>Acceptée</Text>;
    if (status === "rejected") return <Text style={[styles.statusBadge, styles.rejected]}>Refusée</Text>;
    return <Text style={[styles.statusBadge, styles.pending]}>En attente</Text>;
  };

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Trajet introuvable</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Détails du trajet</Text>

      {/* ── Infos trajet (champs du backend) ── */}
      <View style={styles.card}>
        <Text style={styles.label}>Départ</Text>
        <Text style={styles.value}>{trip.depart}</Text>

        <Text style={styles.label}>Destination</Text>
        <Text style={styles.value}>{trip.destination}</Text>

        <Text style={styles.label}>Date & Heure</Text>
        <Text style={styles.value}>{trip.heure}</Text>

        <Text style={styles.label}>Places disponibles</Text>
        <Text style={styles.value}>{trip.places}</Text>

        <TouchableOpacity
  style={styles.edit}
  onPress={() =>
    router.push({
      pathname: "/(driver)/TripEdit",
      params: { trip: JSON.stringify(trip) }
    })
  }
>
  <Text style={styles.actionText}>Modifier</Text>
</TouchableOpacity>
      </View>

      <PrimaryButton
        title="Voir l'itinéraire sur la carte"
        style={{ marginTop: 20 }}
        onPress={() => router.push({
          pathname: "/(driver)/TripMap",
          params: { trip: JSON.stringify(trip) }  // ← passer trip complet
        })}
      />

      <Text style={styles.sectionTitle}>Réservations</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : reservations.length === 0 ? (
        <Text style={styles.empty}>Aucune réservation</Text>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.reservationCard}>

              <View style={styles.row}>
                <Text style={styles.resName}>{item.prenom} {item.nom}</Text>
                {renderStatus(item.status)}
              </View>

              <Text style={styles.resInfo}>📞 {item.telephone}</Text>
              <Text style={styles.resInfo}>💺 {item.places} place(s)</Text>

              <View style={styles.actions}>

                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => item.telephone && Linking.openURL(`tel:${item.telephone}`)}
                >
                  <Text style={styles.callText}>📞 Appeler</Text>
                </TouchableOpacity>

                {item.status === "pending" && (
                  <>
                    <TouchableOpacity
                      style={styles.accept}
                      onPress={() => handleAccept(item.id)}
                    >
                      <Text style={styles.actionText}>✓ Accepter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.reject}
                      onPress={() => handleReject(item.id)}
                    >
                      <Text style={styles.actionText}>✕ Refuser</Text>
                    </TouchableOpacity>
                  </>
                )}

              </View>

            </View>
          )}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, color: COLORS.textLight, textAlign: "center", marginBottom: 24, fontWeight: "600" },
  card: { backgroundColor: "#1F2937", borderRadius: 14, padding: 16 },
  label: { fontSize: 13, color: COLORS.textMuted, marginTop: 12 },
  value: { fontSize: 16, fontWeight: "600", color: "#fff", marginTop: 2 },
  text: { color: COLORS.textMuted },
  sectionTitle: { color: COLORS.textLight, fontSize: 18, marginTop: 30, marginBottom: 10, fontWeight: "600" },
  empty: { color: COLORS.textMuted, textAlign: "center", marginTop: 10 },
  reservationCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10 },
  resName: { fontSize: 16, fontWeight: "600" },
  resInfo: { fontSize: 14, color: "#555", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12, fontWeight: "600", color: "#fff" },
  pending: { backgroundColor: COLORS.warning },
  accepted: { backgroundColor: COLORS.success },
  rejected: { backgroundColor: COLORS.danger },
  callButton: { backgroundColor: COLORS.primary, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  callText: { color: "#fff", fontWeight: "600" },
  accept: { backgroundColor: COLORS.success, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  reject: { backgroundColor: COLORS.danger, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  actionText: { color: "#fff", fontWeight: "600" },
  edit:{
  backgroundColor:"#3B82F6",
  paddingVertical:8,
  paddingHorizontal:14,
  borderRadius:10
}
});