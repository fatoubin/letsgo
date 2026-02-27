import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { API_URL } from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = async () => {
    if (!email) {
      Alert.alert("Erreur", "Veuillez entrer votre email");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Erreur", "Veuillez entrer un email valide");
      return;
    }

    try {
      setLoading(true);

      console.log("📧 Demande de réinitialisation pour:", email);

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log("✅ Réponse:", data);

      // Toujours afficher un message de succès générique, même si l'email n'existe pas
      setEmailSent(true);
    } catch (error) {
      console.error("❌ Erreur:", error);
      // En cas d'erreur réseau, on peut quand même afficher l'écran de confirmation
      // pour ne pas donner d'indice.
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✉️</Text>
          </View>

          <Text style={styles.title}>Email envoyé !</Text>

          <Text style={styles.message}>
            Si un compte existe avec l'adresse {email}, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
          </Text>

          <Text style={styles.note}>
            📧 Pensez à vérifier vos spams
          </Text>

          <TouchableOpacity style={styles.button} onPress={handleBackToLogin}>
            <Text style={styles.buttonText}>Retour à la connexion</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setEmailSent(false)}>
            <Text style={styles.link}>Essayer avec un autre email</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Mot de passe oublié ?</Text>

        <Text style={styles.subtitle}>
          Saisissez votre adresse email pour recevoir les instructions de réinitialisation.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="exemple@email.com"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Envoyer les instructions</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleBackToLogin}>
          <Text style={styles.link}>Retour à la connexion</Text>
        </TouchableOpacity>
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
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 24,
  },
  message: {
    fontSize: 16,
    color: "#E5E7EB",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 24,
  },
  note: {
    fontSize: 14,
    color: "#60A5FA",
    marginBottom: 32,
    textAlign: "center",
    fontStyle: "italic",
  },
  inputContainer: {
    marginBottom: 24,
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
  button: {
    backgroundColor: "#108BFF",
    padding: 18,
    borderRadius: 14,
    marginBottom: 20,
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
  link: {
    color: "#60A5FA",
    textAlign: "center",
    fontSize: 16,
  },
});