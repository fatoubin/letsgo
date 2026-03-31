import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { updateTrip } from "../../src/services/api";

// ── Convertir "2026-03-31T18:00:00.000Z" → "2026-03-31 18:00" ──
function formatHeure(raw: string): string {
  if (!raw) return "";
  // Déjà au bon format
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) return raw.substring(0, 16);
  // Format ISO
  try {
    const d = new Date(raw);
    const date = d.toISOString().substring(0, 10);       // 2026-03-31
    const time = d.toISOString().substring(11, 16);      // 18:00
    return `${date} ${time}`;
  } catch {
    return raw;
  }
}

export default function TripEditScreen() {

  const router = useRouter();
  const params = useLocalSearchParams();

  let trip: any = null;
  try {
    trip = params?.trip ? JSON.parse(params.trip as string) : null;
  } catch {
    trip = null;
  }

  if (!trip) {
    return (
      <View style={globalStyles.screen}>
        <Text style={{ color: COLORS.textLight }}>Trajet introuvable</Text>
      </View>
    );
  }

  const [departure, setDeparture] = useState(trip.depart || "");
  const [destination, setDestination] = useState(trip.destination || "");
  const [heure, setHeure] = useState(formatHeure(trip.heure || ""));
  const [seats, setSeats] = useState(String(trip.places || ""));
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!departure || !destination || !heure) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    // Vérifier le format de l'heure
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(heure)) {
      Alert.alert("Erreur", "Format date invalide. Utilisez: YYYY-MM-DD HH:MM\nEx: 2026-04-01 08:00");
      return;
    }

    setLoading(true);

    try {
      await updateTrip({
        trip_id: trip.id,
        departure,
        destination,
        heure,
        seats: Number(seats) || 1
      });

      Alert.alert("✅ Succès", "Trajet modifié avec succès", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (e: any) {
      console.log("❌ TRIP UPDATE ERROR", e);
      // Si l'erreur vient d'un JSON invalide c'est que la route n'existe pas encore
      if (e?.message?.includes("JSON Parse") || e?.message?.includes("Unexpected")) {
        Alert.alert("Erreur", "La route de modification n'est pas encore déployée sur le serveur. Contacte ta collègue.");
      } else {
        Alert.alert("Erreur", e?.message || "Connexion serveur impossible");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Modifier le trajet</Text>

      <Text style={styles.label}>Départ</Text>
      <TextInput
        style={styles.input}
        value={departure}
        onChangeText={setDeparture}
        placeholder="Lieu de départ"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        value={destination}
        onChangeText={setDestination}
        placeholder="Lieu d'arrivée"
        placeholderTextColor={COLORS.textMuted}
      />

      <Text style={styles.label}>Date & Heure</Text>
      <TextInput
        style={styles.input}
        value={heure}
        onChangeText={setHeure}
        placeholder="YYYY-MM-DD HH:MM"
        placeholderTextColor={COLORS.textMuted}
      />
      <Text style={styles.hint}>Ex: 2026-04-01 08:00</Text>

      <Text style={styles.label}>Places</Text>
      <TextInput
        style={styles.input}
        value={seats}
        onChangeText={setSeats}
        keyboardType="numeric"
        placeholder="Nombre de places"
        placeholderTextColor={COLORS.textMuted}
        maxLength={1}
      />

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <PrimaryButton
          title="Enregistrer les modifications"
          onPress={handleUpdate}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600"
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 12
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
    marginTop: 2
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    fontSize: 16,
    color: "#000"
  }
});