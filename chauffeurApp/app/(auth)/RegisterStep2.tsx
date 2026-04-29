import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { globalStyles } from "../../src/styles/globalStyles";
import { COLORS } from "../../src/styles/colors";

export default function DriverRegisterStep2() {

  const router = useRouter();
  const params = useLocalSearchParams();

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);

  // Demander la permission d'accès à la galerie/caméra
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin d'accéder à votre galerie pour les photos."
      );
      return false;
    }
    return true;
  };

  // Sélectionner une image depuis la galerie
  const pickImage = async (type: "profile" | "license") => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      if (type === "profile") {
        setProfilePhoto(imageUri);
      } else {
        setLicensePhoto(imageUri);
      }
    }
  };

  // Prendre une photo avec la caméra
  const takePhoto = async (type: "profile" | "license") => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin d'accéder à votre appareil photo."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      if (type === "profile") {
        setProfilePhoto(imageUri);
      } else {
        setLicensePhoto(imageUri);
      }
    }
  };

  // Afficher le menu de choix (galerie ou appareil photo)
  const showImageOptions = (type: "profile" | "license") => {
    Alert.alert(
      "Choisir une photo",
      "Sélectionnez une option",
      [
        { text: "Galerie", onPress: () => pickImage(type) },
        { text: "Appareil photo", onPress: () => takePhoto(type) },
        { text: "Annuler", style: "cancel" }
      ],
      { cancelable: true }
    );
  };

  const handleNext = () => {
    router.push({
      pathname: "/(auth)/RegisterStep3",
      params: {
        ...params,
        profilePhoto: profilePhoto || "",
        age,
        licenseNumber,
        licensePhoto: licensePhoto || ""
      }
    });
  };

  return (
    <ScrollView style={globalStyles.screen} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Inscrivez-vous</Text>

      {/* Photo de profil */}
      <View style={styles.field}>
        <Text style={styles.label}>Photo profil</Text>
        <TouchableOpacity 
          style={styles.uploadInput} 
          onPress={() => showImageOptions("profile")}
        >
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto }} style={styles.previewImage} />
          ) : (
            <>
              <Text style={styles.placeholder}>Photo profil</Text>
              <Text style={styles.icon}>＋</Text>
            </>
          )}
        </TouchableOpacity>
        {profilePhoto && (
          <TouchableOpacity 
            style={styles.removeButton} 
            onPress={() => setProfilePhoto(null)}
          >
            <Text style={styles.removeText}>Supprimer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Âge */}
      <View style={styles.field}>
        <Text style={styles.label}>Âge</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          placeholder="Âge"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="numeric"
          style={styles.input}
          maxLength={3}
        />
      </View>

      {/* Numéro permis de conduire */}
      <View style={styles.field}>
        <Text style={styles.label}>Numéro permis de conduire</Text>
        <TextInput
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          placeholder="Numéro permis de conduire"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          autoCapitalize="characters"
        />
      </View>

      {/* Photo permis de conduire */}
      <View style={styles.field}>
        <Text style={styles.label}>Photo permis de conduire</Text>
        <TouchableOpacity 
          style={styles.uploadInput} 
          onPress={() => showImageOptions("license")}
        >
          {licensePhoto ? (
            <Image source={{ uri: licensePhoto }} style={styles.previewImage} />
          ) : (
            <>
              <Text style={styles.placeholder}>Photo permis de conduire</Text>
              <Text style={styles.icon}>＋</Text>
            </>
          )}
        </TouchableOpacity>
        {licensePhoto && (
          <TouchableOpacity 
            style={styles.removeButton} 
            onPress={() => setLicensePhoto(null)}
          >
            <Text style={styles.removeText}>Supprimer</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <PrimaryButton
          title="Suivant"
          onPress={handleNext}
          style={{ backgroundColor: COLORS.primary }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 20,
    marginTop: 20,
    fontWeight: "600"
  },
  field: {
    marginBottom: 18,
    marginHorizontal: 16
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 14
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#000"
  },
  uploadInput: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 55
  },
  placeholder: {
    color: COLORS.textMuted,
    fontSize: 16
  },
  icon: {
    fontSize: 22,
    color: "#000"
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: "cover"
  },
  removeButton: {
    marginTop: 8,
    padding: 8,
    alignItems: "center",
    alignSelf: "flex-start"
  },
  removeText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "600"
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
    marginHorizontal: 16
  }
});