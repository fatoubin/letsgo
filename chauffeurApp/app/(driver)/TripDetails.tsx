import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import PrimaryButton from "../../src/components/PrimaryButton";
import { deleteTrip, getToken, API_URL } from "../../src/services/api";

type Reservation = {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  prix: number;
  status: "pending" | "accepted" | "rejected";
};

export default function DriverTripDetailScreen() {

  const router = useRouter();
  const params = useLocalSearchParams();

  const trip = params?.trip ? JSON.parse(params.trip as string) : null;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!trip?.id) { setLoading(false); return; }
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const token = await getToken();

      if (!token) {
        console.log("❌ Pas de token");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/trips/reservations?trip_id=${trip.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      console.log("📥 RESERVATIONS trip", trip.id, "=", JSON.stringify(data));
      setReservations(Array.isArray(data) ? data : []);

    } catch (e) {
      console.log("❌ RESERVATIONS ERROR", e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fonction ACCEPTER corrigée
  const handleAccept = async (id: number) => {
    setActionLoading(id);
    try {
      console.log("📤 Acceptation réservation:", id);
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/trips/reservation_action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reservation_id: id,
          status: "accepted"
        })
      });

      const data = await response.json();
      console.log("✅ Réponse acceptation:", data);
      
      if (response.ok) {
        Alert.alert("✅ Succès", "Réservation acceptée");
        await fetchReservations();
      } else {
        Alert.alert("Erreur", data.message || "Action impossible");
      }
    } catch (error) {
      console.log("❌ Erreur acceptation:", error);
      Alert.alert("Erreur", "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  // ✅ Fonction REFUSER corrigée
  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      console.log("📤 Refus réservation:", id);
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/trips/reservation_action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          reservation_id: id,
          status: "rejected"
        })
      });

      const data = await response.json();
      console.log("✅ Réponse refus:", data);
      
      if (response.ok) {
        Alert.alert("Refusée", "Réservation refusée");
        await fetchReservations();
      } else {
        Alert.alert("Erreur", data.message || "Action impossible");
      }
    } catch (error) {
      console.log("❌ Erreur refus:", error);
      Alert.alert("Erreur", "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (tripId: number) => {
    Alert.alert(
      "Suppression",
      "Voulez-vous vraiment supprimer ce trajet ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTrip(tripId);
              Alert.alert("✅ Succès", "Trajet supprimé avec succès", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (e: any) {
              console.log("❌ DELETE ERROR", e);
              Alert.alert("Erreur", e.message || "Suppression impossible");
            }
          }
        }
      ]
    );
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
    <ScrollView style={globalStyles.screen}>

      <Text style={styles.title}>Détails du trajet</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Départ</Text>
        <Text style={styles.value}>{trip.depart}</Text>

        <Text style={styles.label}>Destination</Text>
        <Text style={styles.value}>{trip.destination}</Text>

        <Text style={styles.label}>Date & Heure</Text>
        <Text style={styles.value}>{trip.heure}</Text>

        <Text style={styles.label}>Places disponibles</Text>
        <Text style={styles.value}>{trip.places}</Text>

        <Text style={styles.label}>Prix</Text>
        <Text style={styles.value}>
          {trip.prix ? `${trip.prix} FCFA` : "Non défini"}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({
              pathname: "/(driver)/TripEdit",
              params: { trip: JSON.stringify(trip) }
            })}
          >
            <Text style={styles.actionText}>✏️ Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(trip.id)}
          >
            <Text style={styles.actionText}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PrimaryButton
        title="Voir l'itinéraire sur la carte"
        style={{ marginTop: 20 }}
        onPress={() => router.push({
          pathname: "/(driver)/TripMap",
          params: { trip: JSON.stringify(trip) }
        })}
      />

      <PrimaryButton
        title="Voir les réservations"
        style={{ marginTop: 10 }}
        onPress={() => router.push({
          pathname: "/(driver)/Reservations",
          params: { tripId: trip.id }
        })}
      />

      <Text style={styles.sectionTitle}>
        Demandes ({reservations.length})
      </Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : reservations.length === 0 ? (
        <Text style={styles.empty}>Aucune demande pour ce trajet</Text>
      ) : (
        reservations.map((item) => (
          <View key={item.id.toString()} style={styles.reservationCard}>

            <View style={styles.row}>
              <Text style={styles.resName}>{item.prenom} {item.nom}</Text>
              {renderStatus(item.status)}
            </View>

            <Text style={styles.resInfo}>📞 {item.telephone}</Text>
            <Text style={styles.resInfo}>💺 {item.places} place(s)</Text>
            {item.prix ? (
              <Text style={styles.resInfo}>💰 {item.prix} FCFA</Text>
            ) : null}

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
                    disabled={actionLoading === item.id}
                  >
                    {actionLoading === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionText}>✓ Accepter</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reject}
                    onPress={() => handleReject(item.id)}
                    disabled={actionLoading === item.id}
                  >
                    {actionLoading === item.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionText}>✕ Refuser</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>

          </View>
        ))
      )}

      <View style={{ height: 40 }} />

    </ScrollView>
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
  empty: { color: COLORS.textMuted, textAlign: "center", marginTop: 20, fontSize: 15 },
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
  accept: { backgroundColor: COLORS.success, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, flex: 1, alignItems: "center" },
  reject: { backgroundColor: COLORS.danger, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, flex: 1, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  editBtn: { flex: 1, backgroundColor: "#3B82F6", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  deleteBtn: { flex: 1, backgroundColor: COLORS.danger, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
});