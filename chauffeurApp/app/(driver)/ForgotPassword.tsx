import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/services/api";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";
import PrimaryButton from "../../src/components/PrimaryButton";

type Step = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);

  // Étape 1: Envoyer le code
  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre email");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          "✅ Code envoyé",
          "Un code de réinitialisation a été envoyé à votre adresse email.\nVérifiez votre boîte de réception.",
          [{ text: "OK", onPress: () => setStep("code") }]
        );
      } else {
        Alert.alert("Erreur", data.message || "Une erreur est survenue");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  // Étape 2: Vérifier le code
  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      Alert.alert("Erreur", "Veuillez entrer un code valide à 6 chiffres");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetId(data.resetId);
        setStep("password");
      } else {
        Alert.alert("Erreur", data.message || "Code invalide ou expiré");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de vérifier le code");
    } finally {
      setLoading(false);
    }
  };

  // Étape 3: Réinitialiser le mot de passe
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(), 
          code, 
          newPassword 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          "✅ Succès",
          "Votre mot de passe a été réinitialisé avec succès. Veuillez vous connecter.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      } else {
        Alert.alert("Erreur", data.message || "Impossible de réinitialiser le mot de passe");
      }
    } catch (error) {
      Alert.alert("Erreur", "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <>
            <Text style={styles.title}>Mot de passe oublié ?</Text>
            <Text style={styles.subtitle}>
              Entrez votre adresse email et nous vous enverrons un code de réinitialisation.
            </Text>
            
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={styles.input}
              placeholder="exemple@email.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <PrimaryButton
              title={loading ? "Envoi en cours..." : "Envoyer le code"}
              onPress={handleSendCode}
              disabled={loading}
              style={styles.button}
            />
          </>
        );
        
      case "code":
        return (
          <>
            <Text style={styles.title}>Vérification</Text>
            <Text style={styles.subtitle}>
              Un code à 6 chiffres a été envoyé à {email}
            </Text>
            
            <Text style={styles.label}>Code de vérification</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor={COLORS.textMuted}
              value={code}
              onChangeText={setCode}
              keyboardType="numeric"
              maxLength={6}
              textAlign="center"
            />
            
            <PrimaryButton
              title={loading ? "Vérification..." : "Vérifier le code"}
              onPress={handleVerifyCode}
              disabled={loading}
              style={styles.button}
            />
            
            <TouchableOpacity onPress={() => setStep("email")}>
              <Text style={styles.linkText}>Modifier l'adresse email</Text>
            </TouchableOpacity>
          </>
        );
        
      case "password":
        return (
          <>
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>
              Créez un nouveau mot de passe sécurisé
            </Text>
            
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <PrimaryButton
              title={loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
              onPress={handleResetPassword}
              disabled={loading}
              style={styles.button}
            />
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={globalStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        
        {renderStep()}
        
        <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.loginLink}>Retour à la connexion</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textLight,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    color: COLORS.textMuted,
    marginBottom: 6,
    marginTop: 16,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#000",
  },
  codeInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 24,
    color: "#000",
    textAlign: "center",
    letterSpacing: 8,
  },
  button: {
    marginTop: 24,
  },
  linkText: {
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  loginLink: {
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
});