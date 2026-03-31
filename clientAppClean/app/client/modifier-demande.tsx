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
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { updateDemande } from "../../lib/api";

export default function ModifierDemande() {
  const params = useLocalSearchParams();
  const demande = JSON.parse(params.demande as string);

  // États pré‑remplis
  const [depart, setDepart] = useState(demande.depart);
  const [destination, setDestination] = useState(demande.destination);
  const [places, setPlaces] = useState(String(demande.places));
  const [loading, setLoading] = useState(false);

  // États pour date et heure
  const [date, setDate] = useState(() => new Date(demande.date_depart));
  const [heure, setHeure] = useState(() => {
    const [h, m] = demande.heure_depart.split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10));
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatTime = (t: Date) => {
    return t.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async () => {
    if (!depart || !destination || !places) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      const dateStr = formatDate(date).split("/").reverse().join("-");
      const timeStr = formatTime(heure);

      await updateDemande(demande.id, {
        depart,
        destination,
        date_depart: dateStr,
        heure_depart: timeStr,
        places: parseInt(places),
      });

      Alert.alert("Succès", "Demande modifiée avec succès");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Modification impossible");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Modifier ma demande</Text>

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
              <Ionicons name="save" size={20} color="#fff" />
              <Text style={styles.btnText}>Enregistrer les modifications</Text>
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