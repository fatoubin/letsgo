import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Alert
} from "react-native";
import * as ImagePicker from 'expo-image-picker';

import { useRouter, useLocalSearchParams } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { COLORS } from "../../src/styles/colors";

export default function DriverRegisterStep2() {

  const router = useRouter();
  const params = useLocalSearchParams();

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [age, setAge] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);

  // Demander les permissions (caméra + galerie)
  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
      Alert.alert(
        "Permissions refusées",
        "Vous devez autoriser l'accès à la caméra et à la galerie pour ajouter des photos."
      );
      return false;
    }
    return true;
  };

  // Fonction pour prendre une photo
  const takePhoto = async (type: 'profile' | 'license') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      if (type === 'profile') {
        setProfilePhoto(imageUri);
      } else {
        setLicensePhoto(imageUri);
      }
    }
  };

  // Fonction pour choisir depuis la galerie
  const pickFromGallery = async (type: 'profile' | 'license') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      if (type === 'profile') {
        setProfilePhoto(imageUri);
      } else {
        setLicensePhoto(imageUri);
      }
    }
  };

  // Afficher une boîte de dialogue pour choisir la source
  const showImagePickerOptions = (type: 'profile' | 'license') => {
    Alert.alert(
      "Ajouter une photo",
      "Choisissez une option",
      [
        { text: "Prendre une photo", onPress: () => takePhoto(type) },
        { text: "Choisir dans la galerie", onPress: () => pickFromGallery(type) },
        { text: "Annuler", style: "cancel" }
      ],
      { cancelable: true }
    );
  };

  const handleNext = () => {
    if (!age) {
      Alert.alert("Erreur", "Veuillez entrer votre âge");
      return;
    }
    if (!licenseNumber) {
      Alert.alert("Erreur", "Veuillez entrer votre numéro de permis");
      return;
    }

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: COLORS.background || "#1a1a2e" }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, flexGrow: 1 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >

          <Text style={styles.title}>Inscrivez-vous</Text>

          {/* Photo profil */}
          <View style={styles.field}>
            <Text style={styles.label}>Photo profil</Text>

            <TouchableOpacity 
              style={styles.uploadInput} 
              onPress={() => showImagePickerOptions('profile')}
              activeOpacity={0.7}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.previewImage} />
              ) : (
                <>
                  <Text style={styles.placeholder}>Photo profil</Text>
                  <Text style={styles.icon}>📷</Text>
                </>
              )}
            </TouchableOpacity>
            {profilePhoto && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => setProfilePhoto(null)}
              >
                <Text style={styles.removeButtonText}>Supprimer</Text>
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
            />
          </View>

          {/* Numéro de permis */}
          <View style={styles.field}>
            <Text style={styles.label}>Numéro permis de conduire</Text>

            <TextInput
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="Numéro permis de conduire"
              placeholderTextColor={COLORS.textMuted}
              style={styles.input}
            />
          </View>

          {/* Photo permis */}
          <View style={styles.field}>
            <Text style={styles.label}>Photo permis de conduire</Text>

            <TouchableOpacity 
              style={styles.uploadInput} 
              onPress={() => showImagePickerOptions('license')}
              activeOpacity={0.7}
            >
              {licensePhoto ? (
                <Image source={{ uri: licensePhoto }} style={styles.previewImage} />
              ) : (
                <>
                  <Text style={styles.placeholder}>Photo permis de conduire</Text>
                  <Text style={styles.icon}>📷</Text>
                </>
              )}
            </TouchableOpacity>
            {licensePhoto && (
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => setLicensePhoto(null)}
              >
                <Text style={styles.removeButtonText}>Supprimer</Text>
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

          {/* Espace supplémentaire pour s'assurer qu'on peut scroller jusqu'en bas */}
          <View style={{ height: 60 }} />

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({

  title:{
    fontSize:26,
    color:COLORS.textLight,
    textAlign:"center",
    marginBottom:40,
    fontWeight:"600"
  },

  field:{
    marginBottom:18
  },

  label:{
    color:COLORS.textMuted,
    marginBottom:6,
    marginTop:14
  },

  input:{
    backgroundColor:"#fff",
    borderRadius:12,
    padding:14,
    fontSize:16,
    color:"#000"
  },

  uploadInput:{
    flexDirection:"row",
    backgroundColor:"#fff",
    borderRadius:12,
    padding:14,
    alignItems:"center",
    justifyContent:"space-between",
    minHeight: 70
  },

  placeholder:{
    color:COLORS.textMuted,
    fontSize:16
  },

  icon:{
    fontSize:22,
    color:"#000"
  },

  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover'
  },

  removeButton: {
    marginTop: 8,
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },

  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },

  buttonContainer:{
    marginTop:40
  }

});