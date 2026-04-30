import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity
} from "react-native";

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

  const handleNext = () => {

    router.push({
      pathname: "/(auth)/RegisterStep3",
      params: {
        ...params,
        profilePhoto,
        age,
        licenseNumber,
        licensePhoto
      }
    });

  };

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Inscrivez-vous</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Photo profile</Text>

        <TouchableOpacity style={styles.uploadInput}>
          <Text style={styles.placeholder}>Photo profile</Text>
          <Text style={styles.icon}>＋</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.field}>
        <Text style={styles.label}>Photo permis de conduire</Text>

        <TouchableOpacity style={styles.uploadInput}>
          <Text style={styles.placeholder}>Photo permis de conduire</Text>
          <Text style={styles.icon}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>

        <PrimaryButton
          title="Suivant"
          onPress={handleNext}
          style={{ backgroundColor: COLORS.primary }}
        />

      </View>

    </View>
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
    justifyContent:"space-between"
  },

  placeholder:{
    color:COLORS.textMuted,
    fontSize:16
  },

  icon:{
    fontSize:22,
    color:"#000"
  },

  buttonContainer:{
    marginTop:40
  }

});