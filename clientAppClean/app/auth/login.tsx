import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { login } from "../../lib/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Erreur", "Veuillez entrer un email valide");
      return;
    }

    try {
      setLoading(true);

      console.log("🔐 Tentative de connexion pour:", email);
      
      const data = await login(email, password);
      console.log("✅ Réponse login:", data);

      // Vérifier la structure de la réponse
      if (data?.token && data?.user) {
        // Sauvegarder le token et l'utilisateur
        await SecureStore.setItemAsync("token", data.token);
        await SecureStore.setItemAsync("user", JSON.stringify(data.user));
        
        console.log("👤 Utilisateur connecté:", data.user.email);
        
        // Rediriger vers l'écran principal
        router.replace("/(tabs)");
      } else {
        throw new Error("Format de réponse invalide");
      }
    } catch (error: any) {
      console.error("❌ Erreur connexion:", error);
      
      let message = "Erreur de connexion au serveur";
      if (error.message) {
        if (error.message.includes("Network")) {
          message = "Problème de réseau. Vérifiez votre connexion.";
        } else if (error.message.includes("timeout")) {
          message = "Le serveur ne répond pas. Vérifiez que ngrok est lancé.";
        } else {
          message = error.message;
        }
      }
      
      Alert.alert("Connexion impossible", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Bienvenue !</Text>
        <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="exemple@email.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => router.push("/auth/forgot-password")}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Connexion en cours..." : "Se connecter"}
            </Text>
          </TouchableOpacity>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Pas encore de compte ? </Text>
            <TouchableOpacity onPress={() => router.push("/auth/register")}>
              <Text style={styles.registerLink}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 40,
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#FFF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 16,
  },
  eyeText: {
    fontSize: 20,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    color: "#60A5FA",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#108BFF",
    padding: 18,
    borderRadius: 14,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: "#4B5563",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  registerLink: {
    color: "#60A5FA",
    fontSize: 14,
    fontWeight: "bold",
  },
});