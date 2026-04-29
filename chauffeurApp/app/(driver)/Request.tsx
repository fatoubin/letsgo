import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch
} from "react-native";

import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { getDriverRequests, acceptDemande, rejectDemande } from "../../src/services/api";

type Request = {
  id: number;
  depart: string;
  destination: string;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  prix?: number;
  status: "pending" | "accepted" | "rejected";
};

export default function DriverRequestsScreen() {
  const [driverId, setDriverId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<Request[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
      await acceptDemande(id);
      Alert.alert("✅ Succès", "Demande acceptée");
      if (driverId) await fetchRequests(driverId);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await rejectDemande(id);
      Alert.alert("Refusée", "Demande refusée");
      if (driverId) await fetchRequests(driverId);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Action impossible");
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return price.toLocaleString("fr-FR") + " FCFA";
  };

  const renderItem = ({ item }: { item: Request }) => (
    <View style={styles.card}>
      <Text style={styles.route}>
        {item.depart} → {item.destination}
      </Text>
      
      {item.prix && (
        <Text style={styles.price}>{formatPrice(item.prix)}</Text>
      )}
      
      <Text style={styles.info}>- {item.prenom} {item.nom}</Text>
      <Text style={styles.info}>- {item.telephone}</Text>
      <Text style={styles.info}>- {item.places} place(s) demandée(s)</Text>

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
                <Text style={styles.actionText}>Accepter</Text>
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
                <Text style={styles.actionText}>Refuser</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {item.status === "accepted" && (
          <Text style={[styles.statusText, styles.acceptedText]}>Acceptée</Text>
        )}
        {item.status === "rejected" && (
          <Text style={[styles.statusText, styles.rejectedText]}>Refusée</Text>
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
      <Text style={styles.title}>Demandes de réservations</Text>

      {/* Alerte sonore toggle */}
      <View style={styles.alertRow}>
        <Text style={styles.alertText}>Alertes sonores activées pour les nouvelles demandes</Text>
        <Switch
          value={soundEnabled}
          onValueChange={setSoundEnabled}
          trackColor={{ false: "#767577", true: COLORS.primary }}
          thumbColor="#fff"
        />
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune demande pour le moment.</Text>
          <Text style={styles.footerMessage}>
            "Conduisez prudemment, nous veillons sur vos trajets."
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
          <Text style={styles.footerMessage}>
            "Conduisez prudemment, nous veillons sur vos trajets."
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  title: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
    marginTop: 12,
    textAlign: "center",
  },
  alertRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1F2937",
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  alertText: {
    color: COLORS.textLight,
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  route: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111",
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 10,
  },
  accept: {
    backgroundColor: COLORS.success,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  reject: {
    backgroundColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 10,
    flex: 1,
  },
  acceptedText: {
    color: COLORS.success,
  },
  rejectedText: {
    color: COLORS.danger,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  footerMessage: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
    fontStyle: "italic",
  },
});