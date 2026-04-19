import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { fetchWithAuth, API_URL } from "../../src/services/api";
import { getToken } from "../../src/services/api";

type Reservation = {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  status: "pending" | "accepted" | "rejected";
};

export default function DriverReservationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // ✅ Récupérer tripId depuis les paramètres
  const tripId = params.tripId ? Number(params.tripId) : null;

  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (!tripId || isNaN(tripId)) {
      console.log("❌ tripId invalide:", tripId);
      Alert.alert("Erreur", "Trajet non identifié");
      setLoading(false);
      return;
    }
    console.log("✅ tripId valide:", tripId);
    fetchReservations();
  }, [tripId]);

  // ✅ Fonction pour récupérer les réservations des cliet
  const fetchReservations = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        console.log("❌ Pas de token");
        Alert.alert("Erreur", "Non authentifié");
        setLoading(false);
        return;
      }

      console.log("📤 Appel API: /api/trips/reservations?trip_id=", tripId);
      
      const response = await fetch(`${API_URL}/api/trips/reservations?trip_id=${tripId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log("📥 Réponse reçue:", JSON.stringify(data));

      if (response.ok) {
        setReservations(Array.isArray(data) ? data : []);
      } else {
        console.log("❌ Erreur API:", data);
        Alert.alert("Erreur", data.message || "Impossible de charger les réservations");
      }
    } catch (error) {
      console.log("❌ ERREUR fetchReservations:", error);
      Alert.alert("Erreur", "Impossible de charger les réservations");
    } finally {
      setLoading(false);
    }
  };

  // Dans Reservations.tsx, remplacer les fonctions acceptReservation et rejectReservation

const acceptReservation = async (id: number) => {
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
  }
};

const rejectReservation = async (id: number) => {
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
  }
};

  const callPassenger = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const renderStatus = (status: string) => {
    if (status === "accepted") {
      return <Text style={[styles.badge, styles.accepted]}>Acceptée</Text>;
    }
    if (status === "rejected") {
      return <Text style={[styles.badge, styles.rejected]}>Refusée</Text>;
    }
    return <Text style={[styles.badge, styles.pending]}>En attente</Text>;
  };

  const renderItem = ({ item }: { item: Reservation }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.passengerName}>
          {item.prenom} {item.nom}
        </Text>
        {renderStatus(item.status)}
      </View>

      <Text style={styles.info}>📞 {item.telephone}</Text>
      <Text style={styles.info}>💺 {item.places} place(s)</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => callPassenger(item.telephone)}
        >
          <Text style={styles.actionText}>📞 Appeler</Text>
        </TouchableOpacity>

        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => acceptReservation(item.id)}
            >
              <Text style={styles.actionText}>✓ Accepter</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              onPress={() => rejectReservation(item.id)}
            >
              <Text style={styles.actionText}>✕ Refuser</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={globalStyles.screen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.screen}>
      <Text style={styles.title}>Réservations du trajet</Text>
      
      {reservations.length === 0 ? (
        <Text style={styles.empty}>Aucune réservation pour ce trajet</Text>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PrimaryButton
        title="Retour"
        onPress={() => router.back()}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600"
  },
  empty: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 16
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  passengerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111"
  },
  info: {
    fontSize: 14,
    color: "#555",
    marginTop: 4
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 10
  },
  callButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    alignItems: "center"
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    alignItems: "center"
  },
  rejectButton: {
    backgroundColor: COLORS.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    alignItems: "center"
  },
  actionText: {
    color: "#fff",
    fontWeight: "600"
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: "#fff",
    fontWeight: "600"
  },
  pending: {
    backgroundColor: COLORS.warning
  },
  accepted: {
    backgroundColor: COLORS.success
  },
  rejected: {
    backgroundColor: COLORS.danger
  }
});