import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity
} from "react-native";

import { useRouter } from "expo-router";

import PrimaryButton from "../../src/components/PrimaryButton";
import { globalStyles } from "../../src/styles/globalStyles";
import { COLORS } from "../../src/styles/colors";

export default function DriverRegisterStep1() {

  const router = useRouter();

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);

  const handleNext = () => {

    if (
      !firstname.trim() ||
      !lastname.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password.trim()
    ) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        "Mot de passe invalide",
        "Le mot de passe doit contenir au moins 8 caractères"
      );
      return;
    }

    if (!accepted) {
      Alert.alert("Conditions", "Veuillez accepter les conditions");
      return;
    }

    const fullname = `${firstname.trim()} ${lastname.trim()}`;

    router.push({
      pathname: "/(auth)/RegisterStep2",
      params: {
        fullname,
        email: email.trim(),
        phone: phone.trim(),
        password
      }
    });
  };

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Inscrivez-vous</Text>

      <View style={styles.row}>

        <View style={styles.halfField}>
          <Text style={styles.label}>Prénom</Text>

          <TextInput
            value={firstname}
            onChangeText={setFirstname}
            placeholder="Votre prénom"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.halfField}>
          <Text style={styles.label}>Nom</Text>

          <TextInput
            value={lastname}
            onChangeText={setLastname}
            placeholder="Votre nom"
            placeholderTextColor={COLORS.textMuted}
            style={styles.input}
          />
        </View>

      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Adresse e-mail</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Exemple@email.com"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Numéro de Téléphone</Text>

        <View style={styles.phoneRow}>

          <View style={styles.countryCode}>
            <Text style={styles.countryText}>+221</Text>
          </View>

          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="77 xxx xx xx"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
            style={styles.phoneInput}
          />

        </View>
      </View>

      <View style={styles.field}>

        <Text style={styles.label}>Mot de passe</Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="xxxxxxxx"
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry
          style={styles.input}
        />

        <Text style={styles.hint}>
          Doit contenir au moins 8 caractères.
        </Text>

      </View>

      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => setAccepted(!accepted)}
        activeOpacity={0.8}
      >

        <View
          style={[
            styles.checkbox,
            accepted && styles.checkboxChecked
          ]}
        />

        <Text style={styles.termsText}>
          En créant un compte, vous acceptez nos{" "}
          <Text style={styles.link}>conditions d’utilisation</Text> et notre{" "}
          <Text style={styles.link}>politique de confidentialité</Text>.
        </Text>

      </TouchableOpacity>

      <View style={styles.buttonContainer}>

        <PrimaryButton
          title="Suivant"
          onPress={handleNext}
          style={{ backgroundColor: COLORS.primary }}
        />

      </View>

      <Text style={styles.loginText}>
        vous avez déjà un compte ?{" "}
        <Text
          style={styles.link}
          onPress={() => router.push("/(auth)/login")}
        >
          se connecter
        </Text>
      </Text>

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

  row:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginBottom:14
  },

  halfField:{
    width:"48%"
  },

  field:{
    marginBottom:14
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

  phoneRow:{
    flexDirection:"row",
    alignItems:"center"
  },

  countryCode:{
    backgroundColor:"#fff",
    borderRadius:12,
    paddingVertical:14,
    paddingHorizontal:14,
    marginRight:10,
    justifyContent:"center"
  },

  countryText:{
    fontSize:16,
    color:"#000"
  },

  phoneInput:{
    flex:1,
    backgroundColor:"#fff",
    borderRadius:12,
    padding:14,
    fontSize:16,
    color:"#000"
  },

  hint:{
    color:COLORS.textMuted,
    fontSize:12,
    marginTop:6
  },

  termsRow:{
    flexDirection:"row",
    marginTop:18,
    alignItems:"flex-start"
  },

  checkbox:{
    width:18,
    height:18,
    borderRadius:4,
    borderWidth:1,
    borderColor:"#9CA3AF",
    marginRight:10,
    marginTop:2
  },

  checkboxChecked:{
    backgroundColor:COLORS.primary
  },

  termsText:{
    color:COLORS.textMuted,
    fontSize:13,
    lineHeight:18,
    flex:1
  },

  link:{
    color:COLORS.primary
  },

  buttonContainer:{
    marginTop:30
  },

  loginText:{
    color:COLORS.textMuted,
    textAlign:"center",
    marginTop:20
  }

});