import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { fetchWithAuth, API_URL, getToken } from "../../src/services/api";

type DriverProfile = {
  id?: number;
  nom: string;
  prenom: string;
  telephone: string;
  residence: string;
  email?: string;
  vehicle_type: string;
  vehicle_plate: string;
  seats: string;
  license_number: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // ✅ Récupérer driverId depuis les paramètres (plusieurs façons)
  const driverId = params.driverId 
    ? Number(params.driverId) 
    : (params.id ? Number(params.id) : null);
  
  // Alternative: récupérer depuis SecureStore si pas dans params
  const [storedDriverId, setStoredDriverId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DriverProfile>({
    nom: "",
    prenom: "",
    telephone: "",
    residence: "",
    vehicle_type: "",
    vehicle_plate: "",
    seats: "",
    license_number: "",
  });

  useEffect(() => {
    console.log("📱 EditProfile - params reçus:", JSON.stringify(params));
    console.log("📱 EditProfile - driverId depuis params:", driverId);
    
    const init = async () => {
      let finalDriverId = driverId;
      
      // Si pas de driverId dans params, essayer de le récupérer depuis SecureStore
      if (!finalDriverId || isNaN(finalDriverId)) {
        const stored = await SecureStore.getItemAsync("driverId");
        console.log("📱 EditProfile - driverId depuis SecureStore:", stored);
        if (stored) {
          finalDriverId = Number(stored);
          setStoredDriverId(finalDriverId);
        }
      }
      
      if (!finalDriverId || isNaN(finalDriverId)) {
        console.log("❌ driverId invalide ou manquant");
        Alert.alert("Erreur", "Chauffeur non identifié", [
          { text: "OK", onPress: () => router.back() }
        ]);
        setLoading(false);
        return;
      }
      
      await loadProfile(finalDriverId);
    };
    
    init();
  }, [driverId]);

  const loadProfile = async (id: number) => {
    try {
      console.log("📤 Chargement profil pour driverId:", id);
      const data = await fetchWithAuth(`/api/driver/profile?driver_id=${id}`);
      console.log("📥 Profil chargé:", data);
      
      setForm({
        nom: data?.nom || "",
        prenom: data?.prenom || "",
        telephone: data?.telephone || "",
        residence: data?.residence || "",
        vehicle_type: data?.vehicle_type || "",
        vehicle_plate: data?.vehicle_plate || "",
        seats: data?.seats ? String(data.seats) : "",
        license_number: data?.license_number || "",
      });
    } catch (error) {
      console.log("Erreur chargement profil:", error);
      Alert.alert("Erreur", "Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Récupérer l'ID final
    const finalDriverId = driverId || storedDriverId;
    
    if (!finalDriverId || isNaN(finalDriverId)) {
      Alert.alert("Erreur", "Chauffeur non identifié");
      return;
    }
    
    // Validation
    if (!form.nom.trim()) {
      Alert.alert("Erreur", "Veuillez saisir votre nom");
      return;
    }
    if (!form.prenom.trim()) {
      Alert.alert("Erreur", "Veuillez saisir votre prénom");
      return;
    }
    if (!form.telephone.trim()) {
      Alert.alert("Erreur", "Veuillez saisir votre numéro de téléphone");
      return;
    }
    if (!form.vehicle_type.trim()) {
      Alert.alert("Erreur", "Veuillez saisir le type de véhicule");
      return;
    }
    if (!form.vehicle_plate.trim()) {
      Alert.alert("Erreur", "Veuillez saisir la plaque d'immatriculation");
      return;
    }
    if (!form.seats.trim() || Number(form.seats) < 1) {
      Alert.alert("Erreur", "Veuillez saisir un nombre de places valide");
      return;
    }

    setSaving(true);

    try {
      const token = await getToken();
      
      const response = await fetch(`${API_URL}/api/driver/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driver_id: finalDriverId,
          nom: form.nom.trim(),
          prenom: form.prenom.trim(),
          telephone: form.telephone.trim(),
          residence: form.residence.trim(),
          vehicle_type: form.vehicle_type.trim(),
          vehicle_plate: form.vehicle_plate.trim().toUpperCase(),
          seats: Number(form.seats),
          license_number: form.license_number.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert("✅ Succès", "Profil mis à jour avec succès", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Erreur", result.message || "Impossible de mettre à jour le profil");
      }
    } catch (error) {
      console.log("Erreur mise à jour:", error);
      Alert.alert("Erreur", "Impossible de mettre à jour le profil");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={globalStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Modifier le profil</Text>

        {/* Section Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Informations personnelles</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput
                style={styles.input}
                value={form.prenom}
                onChangeText={(text) => setForm({ ...form, prenom: text })}
                placeholder="Votre prénom"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={styles.input}
                value={form.nom}
                onChangeText={(text) => setForm({ ...form, nom: text })}
                placeholder="Votre nom"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <Text style={styles.label}>Téléphone *</Text>
          <TextInput
            style={styles.input}
            value={form.telephone}
            onChangeText={(text) => setForm({ ...form, telephone: text })}
            placeholder="77 123 45 67"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={styles.input}
            value={form.residence}
            onChangeText={(text) => setForm({ ...form, residence: text })}
            placeholder="Votre adresse"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Section Véhicule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚗 Véhicule</Text>

          <Text style={styles.label}>Type de véhicule *</Text>
          <TextInput
            style={styles.input}
            value={form.vehicle_type}
            onChangeText={(text) => setForm({ ...form, vehicle_type: text })}
            placeholder="Ex: Toyota, Peugeot..."
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Plaque d'immatriculation *</Text>
          <TextInput
            style={styles.input}
            value={form.vehicle_plate}
            onChangeText={(text) => setForm({ ...form, vehicle_plate: text.toUpperCase() })}
            placeholder="Ex: DK 1234 AA"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Nombre de places *</Text>
          <TextInput
            style={styles.input}
            value={form.seats}
            onChangeText={(text) => setForm({ ...form, seats: text })}
            placeholder="Ex: 4"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            maxLength={1}
          />

          <Text style={styles.label}>Numéro de permis de conduire</Text>
          <TextInput
            style={styles.input}
            value={form.license_number}
            onChangeText={(text) => setForm({ ...form, license_number: text })}
            placeholder="Numéro de permis"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Boutons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textLight,
  },
  backButton: {
    marginTop: 16,
    marginLeft: 16,
    marginBottom: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfField: {
    width: "48%",
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 12,
    fontSize: 13,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#000",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#374151",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});