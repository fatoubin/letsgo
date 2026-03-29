import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";

import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { createDriverTrip } from "../../src/services/api";

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
    const loadDriverId = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (stored) setDriverId(Number(stored));
    };
    loadDriverId();
  }, []);

  const handleCreateTrip = async () => {

    if (!driverId || isNaN(driverId)) {
      Alert.alert("Erreur", "Chauffeur non identifié");
      return;
    }

    if (!departure || !destination || !date || !time) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      setLoading(true);

      await createDriverTrip({
        driverId,
        departure,
        destination,
        date,
        time,
        seats: Number(seats) || 1,
        price: Number(price) || 0
      });

      Alert.alert("Succès 🎉", "Trajet publié avec succès", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error: any) {
      Alert.alert("Erreur", error.message || "Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Ajouter un trajet</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Départ</Text>
        <TextInput
          style={styles.input}
          placeholder="Lieu de départ"
          placeholderTextColor={COLORS.textMuted}
          value={departure}
          onChangeText={setDeparture}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Destination</Text>
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
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            value={date}
            onChangeText={setDate}
          />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Heure</Text>
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
          <Text style={styles.label}>Places</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex: 4"
            placeholderTextColor={COLORS.textMuted}
            value={seats}
            onChangeText={setSeats}
            maxLength={1}
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
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "600"
  },
  field: {
    marginBottom: 16
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6
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
  }
});