import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { creerDemande } from "../../lib/api";

export default function PlanifierScreen() {
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [places, setPlaces] = useState("1");
  const [loading, setLoading] = useState(false);

  const [date, setDate] = useState(new Date());
  const [heure, setHeure] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const j = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${j}`;
  };

  const formatTime = (t: Date) => {
    const h = t.getHours().toString().padStart(2, "0");
    const m = t.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const handleSubmit = async () => {
    if (!depart.trim() || !destination.trim() || !places) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const dateStr = formatDate(date);
      const timeStr = formatTime(heure);

      await creerDemande({
        depart: depart.trim(),
        destination: destination.trim(),
        date_depart: dateStr,
        heure_depart: timeStr,
        places: parseInt(places),
      });

      Alert.alert(
        "Succès",
        "Votre demande a été enregistrée. Un conducteur vous contactera bientôt."
      );
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible d'enregistrer la demande");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Planifier mon trajet</Text>
      <Text style={styles.subtitle}>
        Exprimez votre besoin, les conducteurs pourront vous proposer des trajets.
      </Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Départ"
          placeholderTextColor="#9AA4BF"
          value={depart}
          onChangeText={setDepart}
        />

        <TextInput
          style={styles.input}
          placeholder="Destination"
          placeholderTextColor="#9AA4BF"
          value={destination}
          onChangeText={setDestination}
        />

        {/* Sélecteur de date */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#4DA3FF" />
          <Text style={styles.pickerText}>{formatDate(date)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
            minimumDate={new Date()}
          />
        )}

        {/* Sélecteur d'heure */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time" size={20} color="#4DA3FF" />
          <Text style={styles.pickerText}>{formatTime(heure)}</Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={heure}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) setHeure(selectedTime);
            }}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Nombre de places"
          placeholderTextColor="#9AA4BF"
          keyboardType="numeric"
          value={places}
          onChangeText={setPlaces}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.btnText}>Publier ma demande</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B132B",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9AA4BF",
    fontSize: 14,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#121C3A",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#1F2A52",
    color: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: "#1F2A52",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  pickerText: {
    color: "#fff",
    fontSize: 16,
  },
  submitBtn: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
