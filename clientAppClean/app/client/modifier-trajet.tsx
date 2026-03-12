import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { updateTrajet } from "../../lib/api";

export default function ModifierTrajet() {
  const params = useLocalSearchParams();
  const trajet = JSON.parse(params.trajet as string);

  // Extraire date et heure de trajet.heure (format attendu: "YYYY-MM-DD HH:MM:SS" ou similaire)
  const [dateDepart, setDateDepart] = useState(() => {
    if (trajet.heure) {
      // Supposons que trajet.heure soit une chaîne comme "2025-03-03T14:30:00" ou "2025-03-03 14:30:00"
      // On prend la partie avant l'espace ou avant T
      const datePart = trajet.heure.split(' ')[0] || trajet.heure.split('T')[0];
      return datePart || '';
    }
    return '';
  });

  const [heureDepart, setHeureDepart] = useState(() => {
    if (trajet.heure) {
      // Pour l'heure, on prend après l'espace ou après T
      let timePart = '';
      if (trajet.heure.includes(' ')) {
        timePart = trajet.heure.split(' ')[1];
      } else if (trajet.heure.includes('T')) {
        timePart = trajet.heure.split('T')[1];
      }
      // Enlever les secondes si présentes (garder HH:MM)
      if (timePart) {
        timePart = timePart.substring(0, 5); // prend les 5 premiers caractères (HH:MM)
      }
      return timePart || '';
    }
    return '';
  });

  const [depart, setDepart] = useState(trajet.depart || '');
  const [destination, setDestination] = useState(trajet.destination || '');
  const [places, setPlaces] = useState(String(trajet.places || ''));

  const submit = async () => {
    if (!depart || !destination || !places || !dateDepart || !heureDepart) {
      Alert.alert("Erreur", "Tous les champs sont requis");
      return;
    }

    // Reconstituer la date-heure au format "YYYY-MM-DD HH:MM:00" (avec secondes à 00)
    const heureFormatted = `${dateDepart} ${heureDepart}:00`;

    try {
      await updateTrajet(trajet.id, {
        depart,
        destination,
        places: Number(places),
        heure: heureFormatted,
      });

      Alert.alert("Succès", "Trajet modifié avec succès");
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Modification impossible");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modifier le trajet</Text>

      <TextInput
        style={styles.input}
        value={depart}
        onChangeText={setDepart}
        placeholder="Départ"
        placeholderTextColor="#aaa"
      />

      <TextInput
        style={styles.input}
        value={destination}
        onChangeText={setDestination}
        placeholder="Destination"
        placeholderTextColor="#aaa"
      />

      <TextInput
        style={styles.input}
        value={dateDepart}
        onChangeText={setDateDepart}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#aaa"
      />

      <TextInput
        style={styles.input}
        value={heureDepart}
        onChangeText={setHeureDepart}
        placeholder="HH:MM"
        placeholderTextColor="#aaa"
      />

      <TextInput
        style={styles.input}
        value={places}
        onChangeText={setPlaces}
        keyboardType="numeric"
        placeholder="Places"
        placeholderTextColor="#aaa"
      />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Enregistrer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", padding: 20 },
  title: { color: "#fff", fontSize: 18, marginBottom: 20 },
  input: {
    backgroundColor: "#1f2937",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
});