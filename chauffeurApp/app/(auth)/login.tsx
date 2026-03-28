import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";

import { useRouter } from "expo-router";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { registerForPushNotificationsAsync } from "../../src/utils/registerForPushNotifications";
import { API_URL } from "../../src/services/api";

export default function DriverLoginScreen() {

  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {

    if (!identifier || !password) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    setLoading(true);

    try {

      const res = await fetch(`${API_URL}/Auth/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password
        })
      });

      const text = await res.text();

      if (text.startsWith("<")) {
        throw new Error("Réponse serveur invalide");
      }

      const data = JSON.parse(text);

      if (!data.success) {
        Alert.alert("Erreur", data.message || "Connexion échouée");
        return;
      }

      const token = await registerForPushNotificationsAsync();

      if (token) {
        await fetch(`${API_URL}/users/save_push_token.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: data.user.id,
            expo_push_token: token
          })
        });
      }

      router.replace("/(driver)/DriverHome");

    } catch (error) {
      console.log("LOGIN DRIVER ERROR:", error);
      Alert.alert("Erreur", "Impossible de se connecter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Connectez-vous</Text>

      <Text style={styles.label}>Email ou Téléphone</Text>

      <TextInput
        style={styles.input}
        placeholder="exemple@email.com"
        value={identifier}
        onChangeText={setIdentifier}
      />

      <Text style={styles.label}>Mot de passe</Text>

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          secureTextEntry={secure}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity onPress={() => setSecure(!secure)}>
          <Text style={styles.eye}>{secure ? "👁️" : "🙈"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/forgot-password")}>
        <Text style={styles.forgot}>Mot de passe oublié ?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
      >

        {loading
          ? <ActivityIndicator color="#fff"/>
          : <Text style={styles.loginText}>SE CONNECTER</Text>
        }

      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/register")}
      >
        <Text style={styles.createAccount}>Créer un compte ?</Text>
      </TouchableOpacity>
      
    </View>
  );
}

const styles = StyleSheet.create({
  title:{
    fontSize:26,
    textAlign:"center",
    marginBottom:40
  },
  label:{
    marginTop:10
  },
  input:{
    backgroundColor:"#fff",
    padding:14,
    borderRadius:10
  },
  passwordContainer:{
    flexDirection:"row",
    alignItems:"center",
    backgroundColor:"#fff",
    borderRadius:10,
    paddingHorizontal:10
  },
  passwordInput:{
    flex:1,
    paddingVertical:14
  },
  eye:{
    fontSize:18
  },
  forgot:{
    textAlign:"right",
    marginTop:8
  },
  loginButton:{
    marginTop:30,
    backgroundColor:COLORS.primary,
    padding:16,
    borderRadius:14,
    alignItems:"center"
  },
  loginText:{
    color:"#fff"
  },
  createAccount:{
    marginTop:14,
    textAlign:"right"
  },
  roleLabel:{
    textAlign:"center",
    marginTop:24
  },
  roleButton:{
    backgroundColor:COLORS.primary,
    padding:14,
    borderRadius:14,
    marginTop:10,
    alignItems:"center"
  },
  roleText:{
    color:"#fff"
  }
});