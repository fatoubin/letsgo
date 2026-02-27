import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { register } from "../../lib/api";

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    residence: "",
    password: "",
    confirmPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Fonction de validation du téléphone sénégalais
  const validatePhoneNumber = (phone: string) => {
    if (!phone) return true; // champ optionnel
    // Supprime les espaces, tirets, etc.
    const cleaned = phone.replace(/[\s\-]/g, '');
    // Formats acceptés :
    // - 771234567 (9 chiffres commençant par 7)
    // - +221771234567 (indicatif +221 suivi de 9 chiffres)
    // - 00221771234567 (indicatif 00221 suivi de 9 chiffres)
    const senegalRegex = /^(?:(?:\+|00)221)?[7][0-9]{8}$/;
    return senegalRegex.test(cleaned);
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Validation prénom
    if (!formData.prenom.trim()) {
      newErrors.prenom = "Le prénom est requis";
    }

    // Validation nom
    if (!formData.nom.trim()) {
      newErrors.nom = "Le nom est requis";
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "L'email est requis";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Email invalide";
    }

    // Validation téléphone (sénégalais)
    if (formData.telephone && !validatePhoneNumber(formData.telephone)) {
      newErrors.telephone = "Numéro sénégalais invalide (ex: 77 123 45 67)";
    }

    // Validation mot de passe
    if (!formData.password) {
      newErrors.password = "Le mot de passe est requis";
    } else if (formData.password.length < 6) {
      newErrors.password = "6 caractères minimum";
    }

    // Validation confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      Alert.alert("Erreur", "Veuillez corriger les erreurs");
      return;
    }

    try {
      setLoading(true);

      console.log("📝 Tentative d'inscription:", formData.email);

      const response = await register({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone || undefined,
        residence: formData.residence || undefined,
        password: formData.password,
      });

      console.log("✅ Réponse inscription:", response);

      if (response.success || response.message?.includes("succès")) {
        Alert.alert(
          "Succès !",
          "Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.",
          [
            {
              text: "Se connecter",
              onPress: () => router.replace("/auth/login"),
            },
          ]
        );
      } else {
        throw new Error(response.message || "Erreur lors de l'inscription");
      }
    } catch (error: any) {
      console.error("❌ Erreur inscription:", error);
      
      let message = "Une erreur est survenue";
      if (error.message) {
        if (error.message.includes("déjà utilisé")) {
          message = "Cet email est déjà utilisé";
        } else if (error.message.includes("réseau")) {
          message = "Problème de connexion. Vérifiez votre réseau.";
        } else {
          message = error.message;
        }
      }
      
      Alert.alert("Inscription impossible", message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Rejoignez la communauté</Text>

        <View style={styles.form}>
          {/* Prénom et Nom */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.half]}>
              <Text style={styles.label}>Prénom *</Text>
              <TextInput
                style={[styles.input, errors.prenom && styles.inputError]}
                placeholder="Jean"
                placeholderTextColor="#9CA3AF"
                value={formData.prenom}
                onChangeText={(value) => updateField("prenom", value)}
                editable={!loading}
              />
              {errors.prenom ? (
                <Text style={styles.errorText}>{errors.prenom}</Text>
              ) : null}
            </View>

            <View style={[styles.inputContainer, styles.half]}>
              <Text style={styles.label}>Nom *</Text>
              <TextInput
                style={[styles.input, errors.nom && styles.inputError]}
                placeholder="Dupont"
                placeholderTextColor="#9CA3AF"
                value={formData.nom}
                onChangeText={(value) => updateField("nom", value)}
                editable={!loading}
              />
              {errors.nom ? (
                <Text style={styles.errorText}>{errors.nom}</Text>
              ) : null}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="exemple@email.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(value) => updateField("email", value)}
              editable={!loading}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
          </View>

          {/* Téléphone (adapté Sénégal) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
            <TextInput
              style={[styles.input, errors.telephone && styles.inputError]}
              placeholder="77 123 45 67"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={formData.telephone}
              onChangeText={(value) => updateField("telephone", value)}
              editable={!loading}
            />
            {errors.telephone ? (
              <Text style={styles.errorText}>{errors.telephone}</Text>
            ) : null}
          </View>

          {/* Résidence */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Lieu de résidence</Text>
            <TextInput
              style={styles.input}
              placeholder="Dakar"
              placeholderTextColor="#9CA3AF"
              value={formData.residence}
              onChangeText={(value) => updateField("residence", value)}
              editable={!loading}
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => updateField("password", value)}
              editable={!loading}
            />
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          {/* Confirmation */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <TextInput
              style={[styles.input, errors.confirmPassword && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={formData.confirmPassword}
              onChangeText={(value) => updateField("confirmPassword", value)}
              editable={!loading}
            />
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          <Text style={styles.requiredHint}>* Champs obligatoires</Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Créer mon compte</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.replace("/auth/login")}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  half: {
    width: "48%",
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
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  requiredHint: {
    color: "#9CA3AF",
    fontSize: 12,
    marginBottom: 24,
    fontStyle: "italic",
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
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  loginLink: {
    color: "#60A5FA",
    fontSize: 14,
    fontWeight: "bold",
  },
});