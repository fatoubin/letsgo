import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from "react-native";

import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { createDriverTrip, getToken, API_URL } from "../../src/services/api";

export default function CreateTripScreen() {

  const router = useRouter();

  const [driverId, setDriverId] = useState<number | null>(null);
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Lire driverId depuis SecureStore au montage ──
  useEffect(() => {
    const loadDriverData = async () => {
      try {
        const storedDriverId = await SecureStore.getItemAsync("driverId");
        const storedToken = await getToken();
        
        console.log("🔑 Token JWT présent:", storedToken ? "OUI" : "NON");
        console.log("👤 DriverId stocké:", storedDriverId);
        
        if (storedDriverId) {
          setDriverId(Number(storedDriverId));
        } else {
          console.warn("⚠️ Pas de driverId trouvé");
          Alert.alert(
            "Session invalide",
            "Veuillez vous reconnecter",
            [{ text: "OK", onPress: () => router.replace("/(auth)/DriverLogin") }]
          );
        }
        
        if (!storedToken) {
          console.warn("⚠️ Pas de token JWT trouvé");
          Alert.alert(
            "Session expirée",
            "Veuillez vous reconnecter",
            [{ text: "OK", onPress: () => router.replace("/(auth)/DriverLogin") }]
          );
        }
      } catch (error) {
        console.error("❌ Erreur chargement données:", error);
      }
    };
    loadDriverData();
  }, []);

  const handleCreateTrip = async () => {

    if (!driverId || isNaN(driverId)) {
      Alert.alert("Erreur", "Chauffeur non identifié. Veuillez vous reconnecter.");
      router.replace("/(auth)/DriverLogin");
      return;
    }

    if (!departure || !destination || !date || !time) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    // Validation du format de date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert("Erreur", "Format de date invalide. Utilisez YYYY-MM-DD");
      return;
    }

    // Validation du format d'heure
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(time)) {
      Alert.alert("Erreur", "Format d'heure invalide. Utilisez HH:MM");
      return;
    }

    const seatsNum = Number(seats);
    if (isNaN(seatsNum) || seatsNum < 1) {
      Alert.alert("Erreur", "Nombre de places invalide (minimum 1)");
      return;
    }

    setLoading(true);

    try {
      // Vérifier le token avant d'envoyer
      const token = await getToken();
      console.log("🔑 Token avant envoi:", token ? token.substring(0, 50) + "..." : "NON");
      
      if (!token) {
        throw new Error("Token manquant, veuillez vous reconnecter");
      }

      console.log("📤 Création trajet avec:", {
        driverId,
        departure,
        destination,
        date,
        time,
        seats: seatsNum,
        price: Number(price) || 0
      });

      const result = await createDriverTrip({
        driverId,
        departure,
        destination,
        date,
        time,
        seats: seatsNum,
        price: Number(price) || 0
      });

      console.log("✅ Trajet créé:", result);

      Alert.alert("Succès 🎉", "Trajet publié avec succès", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error: any) {
      console.error("❌ Erreur création trajet:", error);
      
      // Gérer spécifiquement les erreurs d'authentification
      if (error.message?.includes("Token") || error.message?.includes("authentifi")) {
        Alert.alert(
          "Session expirée",
          "Votre session a expiré. Veuillez vous reconnecter.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/DriverLogin") }]
        );
      } else {
        Alert.alert("Erreur", error.message || "Erreur serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.screen}>
      
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={{ marginTop: 10, marginLeft: 5 }}
      >
        <Text style={{ color: COLORS.primary, fontSize: 16 }}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Ajouter un trajet</Text>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Départ *</Text>
          <TextInput
            style={styles.input}
            placeholder="Lieu de départ"
            placeholderTextColor={COLORS.textMuted}
            value={departure}
            onChangeText={setDeparture}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={styles.input}
            placeholder="Lieu d'arrivée"
            placeholderTextColor={COLORS.textMuted}
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={date}
              onChangeText={setDate}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Heure *</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.textMuted}
              value={time}
              onChangeText={setTime}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={styles.label}>Places *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex: 4"
              placeholderTextColor={COLORS.textMuted}
              value={seats}
              onChangeText={setSeats}
            />
          </View>
          <View style={styles.half}>
            <Text style={styles.label}>Prix (FCFA)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex: 1500"
              placeholderTextColor={COLORS.textMuted}
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </View>

        <Text style={styles.hint}>
          Format date: 2025-12-25 | Format heure: 08:30
        </Text>

        <View style={{ marginTop: 30 }}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <PrimaryButton
              title="Publier le trajet"
              onPress={handleCreateTrip}
            />
          )}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16
  },
  field: {
    marginBottom: 16
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    fontSize: 14
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#000"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  half: {
    width: "48%"
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: "center"
  }
});