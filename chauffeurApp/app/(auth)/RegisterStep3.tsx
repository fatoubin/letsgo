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

  // ── Params reçus de Step1 ──
  // fullname, email, phone, password

  // ── Params reçus de Step2 (via ...params) ──
  // profilePhoto, age, licenseNumber, licensePhoto

  const [brand, setBrand] = useState("");
  const [plate, setPlate] = useState("");
  const [seats, setSeats] = useState("");
  const [loading, setLoading] = useState(false);

  const submitDriver = async () => {
  console.log("=== SUBMIT CALLED ===");
  console.log("PARAMS =", JSON.stringify(params));

  if (!brand || !plate || !seats) {
    Alert.alert("Erreur", "Veuillez remplir tous les champs");
    return;
  }

  const fullnameParts = String(params.fullname ?? "").trim().split(" ");
  const prenom = fullnameParts[0] ?? "";
  const nom = fullnameParts.slice(1).join(" ") || prenom;

  console.log("nom =", nom, "| prenom =", prenom);

  setLoading(true);

  try {

    console.log("📡 Appel RegisterStep3...");

    const resUser = await fetch(`${API_URL}/api/auth/RegisterStep3`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom,
        prenom,
        email: params.email,
        telephone: params.phone,
        residence: "",
        password: params.password,
      }),
    });

    console.log("📥 resUser.status =", resUser.status);

    const dataUser = await resUser.json();
    console.log("📥 dataUser =", JSON.stringify(dataUser));

    if (!resUser.ok) {
      Alert.alert("Erreur inscription", dataUser.message || "Inscription échouée");
      return;
    }

    console.log("📡 Appel driver/register...");

    const resDriver = await fetch(`${API_URL}/api/driver/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: dataUser.userId,
        vehicle_type: brand.trim(),
        license_number: params.licenseNumber ?? "",
        vehicle_plate: plate.trim(),
        seats: Number(seats),
      }),
    });

    console.log("📥 resDriver.status =", resDriver.status);

    const dataDriver = await resDriver.json();
    console.log("📥 dataDriver =", JSON.stringify(dataDriver));

    if (!resDriver.ok) {
      Alert.alert("Erreur", dataDriver.message || "Création chauffeur échouée");
      return;
    }

    Alert.alert(
      "Succès 🎉",
      "Compte chauffeur créé avec succès !",
      [{ text: "Se connecter", onPress: () => router.replace("/(auth)/driver-login") }]
    );

  } catch (error: any) {
    console.log("❌ CATCH ERROR =", error?.message ?? String(error));
    Alert.alert("Erreur détaillée", error?.message ?? String(error));
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
