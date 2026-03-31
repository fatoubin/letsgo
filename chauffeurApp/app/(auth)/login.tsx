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
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { API_URL } from "../../src/services/api";

export default function DriverLoginScreen() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {

    if (!email || !password) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    setLoading(true);

    try {

      const res = await fetch(`${API_URL}/api/driver/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      console.log("📥 LOGIN status =", res.status, "| data =", JSON.stringify(data));

      if (!res.ok) {
        Alert.alert("Erreur", data.message || "Connexion échouée");
        return;
      }

      // ── Sauvegarder token + infos chauffeur ──
      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));
      await SecureStore.setItemAsync("driverId", String(data.user.driverId));

      router.replace("/(driver)/DriverHome");

    } catch (error: any) {
      console.log("❌ LOGIN ERROR:", error?.message ?? String(error));
      Alert.alert("Erreur", "Impossible de se connecter. Vérifiez votre internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={globalStyles.screen}>

      <Text style={styles.title}>Connectez-vous</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="exemple@email.com"
        placeholderTextColor={COLORS.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Mot de passe</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          secureTextEntry={secure}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textMuted}
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
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.loginText}>SE CONNECTER</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/RegisterStep1")}>
        <Text style={styles.createAccount}>Pas encore de compte ? S'inscrire</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    textAlign: "center",
    marginBottom: 40,
    color: COLORS.textLight,
    fontWeight: "600"
  },
  label: {
    marginTop: 16,
    marginBottom: 6,
    color: COLORS.textMuted
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#000"
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000"
  },
  eye: {
    fontSize: 18
  },
  forgot: {
    textAlign: "right",
    marginTop: 8,
    color: COLORS.textMuted
  },
  loginButton: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center"
  },
  loginText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  },
  createAccount: {
    marginTop: 20,
    textAlign: "center",
    color: COLORS.textMuted
  }
});