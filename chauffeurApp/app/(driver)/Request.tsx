import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";

import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverRequests, acceptReservation, rejectReservation, API_URL, getToken } from "../../src/services/api";

type Request = {
  id: number;
  depart: string;
  destination: string;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  status: "pending" | "accepted" | "rejected";
};

export default function DriverRequestsScreen() {
  const [driverId, setDriverId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (!stored) {
        Alert.alert("Erreur", "Chauffeur non identifié");
        setLoading(false);
        return;
      }
      const id = Number(stored);
      setDriverId(id);
      await fetchRequests(id);
    };
    init();
  }, []);

  const fetchRequests = async (id: number) => {
    try {
      setLoading(true);
      const data = await getDriverRequests(id);
      console.log("📥 Demandes reçues:", JSON.stringify(data));
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("❌ DRIVER REQUESTS ERROR", error);
      Alert.alert("Erreur", "Impossible de charger les demandes");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    setActionLoading(id);
    try {
      console.log("📤 Acceptation de la demande:", id);
      const result = await acceptReservation(id);
      console.log("✅ Réponse acceptation:", result);
      Alert.alert("✅ Succès", "Réservation acceptée");
      if (driverId) await fetchRequests(driverId);
    } catch (e: any) {
      console.log("❌ Erreur acceptation:", e);
      Alert.alert("Erreur", e.message || "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      console.log("📤 Refus de la demande:", id);
      const result = await rejectReservation(id);
      console.log("✅ Réponse refus:", result);
      Alert.alert("Refusée", "Réservation refusée");
      if (driverId) await fetchRequests(driverId);
    } catch (e: any) {
      console.log("❌ Erreur refus:", e);
      Alert.alert("Erreur", e.message || "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const renderItem = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <Text style={styles.route}>
        {item.depart} → {item.destination}
      </Text>
      <Text style={styles.info}>👤 {item.prenom} {item.nom}</Text>
      <Text style={styles.info}>📞 {item.telephone}</Text>
      <Text style={styles.info}>💺 {item.places} place(s) demandée(s)</Text>

      <View style={styles.actions}>
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
        {item.status === "accepted" && (
          <Text style={[styles.statusText, { color: COLORS.success }]}>✔ Acceptée</Text>
        )}
        {item.status === "rejected" && (
          <Text style={[styles.statusText, { color: COLORS.danger }]}>✖ Refusée</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Text style={styles.title}>Demandes de réservation</Text>
      {requests.length === 0 ? (
        <Text style={styles.empty}>Aucune demande pour le moment.</Text>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: COLORS.textLight, fontSize: 22, fontWeight: "600", marginBottom: 20, textAlign: "center" },
  empty: { color: COLORS.textMuted, textAlign: "center", marginTop: 40, fontSize: 16 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 14 },
  route: { fontSize: 16, fontWeight: "700", marginBottom: 8, color: "#111" },
  info: { fontSize: 14, color: "#555", marginBottom: 4 },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, gap: 10 },
  accept: { backgroundColor: COLORS.success, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, flex: 1, alignItems: "center" },
  reject: { backgroundColor: COLORS.danger, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10, flex: 1, alignItems: "center" },
  actionText: { color: "#fff", fontWeight: "600" },
  statusText: { fontSize: 14, fontWeight: "600", textAlign: "center", paddingVertical: 10, flex: 1 }
});