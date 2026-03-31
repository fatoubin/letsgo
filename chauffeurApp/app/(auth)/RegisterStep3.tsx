import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { globalStyles } from "../../src/styles/globalStyles";
import { COLORS } from "../../src/styles/colors";
import { API_URL } from "../../src/services/api";

export default function DriverRegisterStep3() {

  const router = useRouter();
  const params = useLocalSearchParams();

  const [brand, setBrand] = useState("");
  const [plate, setPlate] = useState("");
  const [seats, setSeats] = useState("");
  const [loading, setLoading] = useState(false);

  const submitDriver = async () => {

    if (!brand || !plate || !seats) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    // Séparer fullname → prenom + nom
    const fullnameParts = String(params.fullname ?? "").trim().split(" ");
    const prenom = fullnameParts[0] ?? "";
    const nom = fullnameParts.slice(1).join(" ") || prenom;

    setLoading(true);

    try {

      // ── UN SEUL appel qui crée user + driver en même temps ──
      const res = await fetch(`${API_URL}/api/driver/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // infos utilisateur
          nom,
          prenom,
          email: params.email,
          telephone: params.phone,
          residence: "",
          password: params.password,
          // infos véhicule
          vehicle_type: brand.trim(),
          license_number: String(params.licenseNumber ?? ""),
          vehicle_plate: plate.trim(),
          seats: Number(seats),
        }),
      });

      const data = await res.json();
      console.log("📥 status =", res.status, "| data =", JSON.stringify(data));

      if (!res.ok) {
        Alert.alert("Erreur", data.message || "Inscription échouée");
        return;
      }

      // ── SUCCÈS ──
      Alert.alert(
        "Succès 🎉",
        "Compte chauffeur créé avec succès !",
        [{ text: "Se connecter", onPress: () => router.replace("/(auth)/login") }]
      );

    } catch (error: any) {
      console.log("❌ CATCH ERROR =", error?.message ?? String(error));
      Alert.alert("Erreur", error?.message ?? "Connexion serveur impossible");
    } finally {
      setLoading(false);
    }

  };

  return (

    <View style={globalStyles.screen}>

      <Text style={styles.title}>Inscrivez-vous</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Marque de véhicule</Text>
        <TextInput
          value={brand}
          onChangeText={setBrand}
          placeholder="Ex: Toyota, Peugeot..."
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Plaque d'immatriculation</Text>
        <TextInput
          value={plate}
          onChangeText={setPlate}
          placeholder="Ex: DK 1234 AA"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.labelStrong}>Nombre de places</Text>
        <TextInput
          value={seats}
          onChangeText={setSeats}
          placeholder="Ex: 4"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          style={styles.input}
          maxLength={1}
        />
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.textLight} />
        ) : (
          <PrimaryButton
            title="Créer mon compte"
            onPress={submitDriver}
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
    marginBottom: 40,
    fontWeight: "600"
  },

  field: {
    marginBottom: 18
  },

  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 14
  },

  labelStrong: {
    color: COLORS.textLight,
    marginBottom: 6,
    marginTop: 14,
    fontWeight: "500"
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#000"
  },

  buttonContainer: {
    marginTop: 40
  }

});