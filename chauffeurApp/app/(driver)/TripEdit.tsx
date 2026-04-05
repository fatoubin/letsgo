import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { updateTrip } from "../../src/services/api";

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
        <Text style={{ color: COLORS.textLight, textAlign: 'center' }}>Trajet introuvable</Text>
        <TouchableOpacity 
          style={{ marginTop: 20, backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff' }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Champs du backend : depart, destination, heure, places, prix
  const [departure, setDeparture] = useState(trip.depart || "");
  const [destination, setDestination] = useState(trip.destination || "");
  const [heure, setHeure] = useState(trip.heure || "");
  const [seats, setSeats] = useState(String(trip.places || ""));
  const [price, setPrice] = useState(String(trip.prix || ""));
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    // Validation des champs
    if (!departure || !departure.trim()) {
      Alert.alert("Erreur", "Veuillez saisir le lieu de départ");
      return;
    }
    
    if (!destination || !destination.trim()) {
      Alert.alert("Erreur", "Veuillez saisir la destination");
      return;
    }
    
    if (!heure || !heure.trim()) {
      Alert.alert("Erreur", "Veuillez saisir la date et l'heure");
      return;
    }
    
    const seatsNum = Number(seats);
    if (isNaN(seatsNum) || seatsNum < 1) {
      Alert.alert("Erreur", "Veuillez saisir un nombre de places valide (minimum 1)");
      return;
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      Alert.alert("Erreur", "Veuillez saisir un prix valide");
      return;
    }

    setLoading(true);

    try {
      console.log("📤 Envoi modification:", {
        trip_id: trip.id,
        departure: departure.trim(),
        destination: destination.trim(),
        heure: heure.trim(),
        seats: seatsNum,
        price: priceNum
      });

      const result = await updateTrip({
        trip_id: trip.id,
        departure: departure.trim(),
        destination: destination.trim(),
        heure: heure.trim(),
        seats: seatsNum,
        price: priceNum
      });

      console.log("✅ Réponse modification:", result);

      Alert.alert(
        "✅ Succès", 
        "Trajet modifié avec succès",
        [{ text: "OK", onPress: () => router.back() }]
      );

    } catch (e: any) {
      console.log("❌ ERREUR modification:", e);
      Alert.alert(
        "Erreur", 
        e?.message || "Impossible de modifier le trajet. Vérifiez votre connexion."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={globalStyles.screen}>
      
      <TouchableOpacity 
        onPress={() => router.back()} 
        style={{ marginTop: 10, marginLeft: 5 }}
      >
        <Text style={{ color: COLORS.primary, fontSize: 16 }}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Modifier le trajet</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Lieu de départ *</Text>
        <TextInput
          style={styles.input}
          value={departure}
          onChangeText={setDeparture}
          placeholder="Ex: Dakar, Gare Routière"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Destination *</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Ex: Touba, Grande Mosquée"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Date et heure *</Text>
        <TextInput
          style={styles.input}
          value={heure}
          onChangeText={setHeure}
          placeholder="Format: YYYY-MM-DD HH:MM:SS"
          placeholderTextColor={COLORS.textMuted}
        />
        <Text style={styles.hint}>
          Exemple: 2025-12-25 08:30:00
        </Text>

        <Text style={styles.label}>Places disponibles *</Text>
        <TextInput
          style={styles.input}
          value={seats}
          onChangeText={setSeats}
          keyboardType="numeric"
          placeholder="Nombre de places"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.label}>Prix (FCFA) *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="Ex: 1500"
          placeholderTextColor={COLORS.textMuted}
        />

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <PrimaryButton
            title="Enregistrer les modifications"
            onPress={handleUpdate}
            style={{ marginTop: 20 }}
          />
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    color: COLORS.textLight,
    textAlign: "center",
    marginVertical: 20,
    fontWeight: "600"
  },
  card: {
    backgroundColor: "#1F2937",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 30
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 12,
    fontSize: 14
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#000"
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 5,
    marginBottom: 5
  }
});