import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { updateTrajet } from "../../lib/api";

export default function ModifierTrajet() {
  const params = useLocalSearchParams();
  const trajet = JSON.parse(params.trajet as string);

  // 🔁 Pré-remplissage
  const [depart, setDepart] = useState(trajet.depart);
  const [destination, setDestination] = useState(trajet.destination);
  const [places, setPlaces] = useState(String(trajet.places));

  // 🕒 Heure et date déjà définies
  const [dateDepart, setDateDepart] = useState(
    trajet.date_depart || trajet.heure?.split(" ")[0]
  );
  const [heureDepart, setHeureDepart] = useState(
    trajet.heure_depart || trajet.heure?.split(" ")[1]
  );

  const submit = async () => {
    if (!depart || !destination || !places || !dateDepart || !heureDepart) {
      Alert.alert("Erreur", "Champs manquants");
      return;
    }

    try {
      await updateTrajet(trajet.id, {
        depart,
        destination,
        places: Number(places),
        heure: `${dateDepart} ${heureDepart}`,
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
