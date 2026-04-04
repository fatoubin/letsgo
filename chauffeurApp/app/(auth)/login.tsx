import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";

import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import { API_URL } from "../../src/services/api";

export default function DriverLoginScreen() {

  const router = useRouter();

  // États pour les champs
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  
  // États de validation
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Charger les identifiants sauvegardés au démarrage
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync("saved_email");
      const savedPhone = await SecureStore.getItemAsync("saved_phone");
      const savedRemember = await SecureStore.getItemAsync("remember_me");
      
      if (savedRemember === "true") {
        setRememberMe(true);
        if (savedEmail) {
          setEmail(savedEmail);
          setLoginMethod("email");
        }
        if (savedPhone) {
          setPhone(savedPhone);
          setLoginMethod("phone");
        }
      }
    } catch (error) {
      console.log("Erreur chargement credentials:", error);
    }
  };

  const saveCredentials = async () => {
    try {
      if (rememberMe) {
        if (loginMethod === "email" && email) {
          await SecureStore.setItemAsync("saved_email", email);
        }
        if (loginMethod === "phone" && phone) {
          await SecureStore.setItemAsync("saved_phone", phone);
        }
        await SecureStore.setItemAsync("remember_me", "true");
      } else {
        await SecureStore.deleteItemAsync("saved_email");
        await SecureStore.deleteItemAsync("saved_phone");
        await SecureStore.setItemAsync("remember_me", "false");
      }
    } catch (error) {
      console.log("Erreur sauvegarde credentials:", error);
    }
  };

  // Validation email
  const validateEmail = (text: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (text && !emailRegex.test(text)) {
      setEmailError("Email invalide");
      return false;
    }
    setEmailError("");
    return true;
  };

  // Validation téléphone
  const validatePhone = (text: string) => {
    const phoneRegex = /^(\+221)?[7][0-9]{8}$/;
    if (text && !phoneRegex.test(text) && !phoneRegex.test(`+221${text}`)) {
      setPhoneError("Numéro invalide (ex: 77 000 00 00)");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    validateEmail(text);
  };

  const handlePhoneChange = (text: string) => {
    // Nettoyer le numéro
    let cleaned = text.replace(/[^0-9+]/g, "");
    setPhone(cleaned);
    validatePhone(cleaned);
  };

  const handleLogin = async () => {
    // Validation selon la méthode choisie
    if (loginMethod === "email" && !email) {
      Alert.alert("Erreur", "Veuillez entrer votre email");
      return;
    }
    if (loginMethod === "phone" && !phone) {
      Alert.alert("Erreur", "Veuillez entrer votre numéro de téléphone");
      return;
    }
    if (!password) {
      Alert.alert("Erreur", "Veuillez entrer votre mot de passe");
      return;
    }

    // Validation format
    if (loginMethod === "email" && !validateEmail(email)) {
      Alert.alert("Erreur", "Email invalide");
      return;
    }
    if (loginMethod === "phone" && !validatePhone(phone)) {
      Alert.alert("Erreur", "Numéro de téléphone invalide");
      return;
    }

    setLoading(true);

    try {
      // Préparer l'identifiant (email ou téléphone)
      const identifier = loginMethod === "email" ? email : phone;
      
      const res = await fetch(`${API_URL}/api/driver/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password })
      });

      const data = await res.json();
      console.log("📥 LOGIN status =", res.status, "| data =", JSON.stringify(data));

      if (!res.ok) {
        Alert.alert("Erreur", data.message || "Connexion échouée");
        return;
      }

      // Sauvegarder token + infos chauffeur
      await SecureStore.setItemAsync("token", data.token);
      await SecureStore.setItemAsync("user", JSON.stringify(data.user));
      await SecureStore.setItemAsync("driverId", String(data.user.driverId));
      
      // Sauvegarder les credentials si "Se souvenir de moi" est coché
      await saveCredentials();

      router.replace("/(driver)/DriverHome");

    } catch (error: any) {
      console.log("❌ LOGIN ERROR:", error?.message ?? String(error));
      Alert.alert("Erreur", "Impossible de se connecter. Vérifiez votre internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      "Connexion Google",
      "Cette fonctionnalité sera bientôt disponible. Veuillez utiliser email/téléphone pour le moment."
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={globalStyles.screen}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre */}
        <Text style={styles.title}>Connectez-vous</Text>
        <Text style={styles.subtitle}>Accédez à votre espace chauffeur</Text>

        {/* Sélecteur Email / Téléphone */}
        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[
              styles.methodButton,
              loginMethod === "email" && styles.methodButtonActive
            ]}
            onPress={() => setLoginMethod("email")}
          >
            <Text style={[
              styles.methodText,
              loginMethod === "email" && styles.methodTextActive
            ]}>
              📧 Email
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.methodButton,
              loginMethod === "phone" && styles.methodButtonActive
            ]}
            onPress={() => setLoginMethod("phone")}
          >
            <Text style={[
              styles.methodText,
              loginMethod === "phone" && styles.methodTextActive
            ]}>
              📱 Téléphone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Champ Email ou Téléphone selon sélection */}
        {loginMethod === "email" ? (
          <View>
            <Text style={styles.label}>ADRESSE EMAIL</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="exemple@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          </View>
        ) : (
          <View>
            <Text style={styles.label}>NUMÉRO DE TÉLÉPHONE</Text>
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇸🇳 +221</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, phoneError ? styles.inputError : null]}
                placeholder="77 000 00 00"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
              />
            </View>
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
          </View>
        )}

        {/* Mot de passe */}
        <Text style={styles.label}>MOT DE PASSE</Text>
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

        {/* Mot de passe oublié + Se souvenir de moi */}
        <View style={styles.optionsRow}>
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgot}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
          
          <View style={styles.rememberContainer}>
            <Switch
              value={rememberMe}
              onValueChange={setRememberMe}
              trackColor={{ false: "#767577", true: COLORS.primary }}
              thumbColor="#fff"
            />
            <Text style={styles.rememberText}>Se souvenir de moi</Text>
          </View>
        </View>

        {/* Bouton SE CONNECTER */}
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

        {/* Séparateur OU */}
        <View style={styles.separatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.separatorText}>OU</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* Bouton Google */}
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleText}>Continuer avec Google</Text>
        </TouchableOpacity>

        {/* Lien inscription */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Pas encore de compte ? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/RegisterStep1")}>
            <Text style={styles.signupLink}>S'inscrire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 8,
    color: COLORS.textLight,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
    color: COLORS.textMuted,
    opacity: 0.8,
  },
  methodSelector: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    marginBottom: 24,
    padding: 4,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  methodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  methodTextActive: {
    color: "#fff",
  },
  label: {
    marginTop: 16,
    marginBottom: 6,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#000",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryCode: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    fontSize: 16,
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
  },
  eye: {
    fontSize: 18,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  forgot: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "500",
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberText: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginLeft: 8,
  },
  loginButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  separatorText: {
    marginHorizontal: 16,
    color: COLORS.textMuted,
    fontSize: 12,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  googleIcon: {
    width: 24,
    height: 24,
    backgroundColor: "#4285F4",
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
    borderRadius: 12,
    marginRight: 12,
    fontWeight: "bold",
    overflow: "hidden",
  },
  googleText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  signupText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  signupLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
});