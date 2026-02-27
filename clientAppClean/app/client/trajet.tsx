import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { createTrajet } from "../../lib/api";

export default function Trajet() {
  const [depart, setDepart] = useState("");
  const [destination, setDestination] = useState("");
  const [places, setPlaces] = useState("1");

  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [region, setRegion] = useState({
    latitude: 14.6928,
    longitude: -17.4467,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [loading, setLoading] = useState(false);


  // ----------------------------
  // POSITION ACTUELLE (TRADUITE)
  // ----------------------------
  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission localisation refusée");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      });

      const addresses = await Location.reverseGeocodeAsync(loc.coords);
      if (addresses.length > 0) {
        const a = addresses[0];
        const label = [a.street, a.district, a.city].filter(Boolean).join(", ");
        setDepart(label || "Position actuelle");
      } else {
        setDepart("Position actuelle");
      }
    } catch {
      Alert.alert("Erreur", "Impossible d'obtenir la position");
    }
  };

  // ----------------------------
  // FORMAT DATE / HEURE
  // ----------------------------
  const formatDate = (d: Date) =>
    d.toISOString().split("T")[0];

  const formatTime = (d: Date) =>
    d.toTimeString().slice(0, 5);

  // ----------------------------
  // PUBLIER TRAJET
  // ----------------------------
  const submit = async () => {
    if (!destination || !places || !date || !time) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);

    try {
      await createTrajet({
        depart: depart || "Position actuelle",
        destination,
        places: Number(places),
        date_depart: formatDate(date),
        heure_depart: formatTime(time),
      });

      Alert.alert("Succès", "Trajet publié avec succès");

      setDestination("");
      setPlaces("1");
      setDate(null);
      setTime(null);
    } catch {
      Alert.alert("Erreur", "Action impossible");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region}>
        <Marker coordinate={region} />
      </MapView>

      <View style={styles.form}>
        <Text style={styles.label}>Départ</Text>
        <TextInput
          style={styles.input}
          value={depart}
          onChangeText={setDepart}
          placeholder="Lieu de départ"
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity style={styles.btnSecondary} onPress={useCurrentLocation}>
          <Text style={styles.btnText}>Utiliser ma position actuelle</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Destination"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Date de départ</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.valueText}>
            {date ? formatDate(date) : "Choisir une date"}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="calendar"
            onChange={(_, d) => {
              setShowDatePicker(false);
              if (d) setDate(d);
            }}
          />
        )}

        <Text style={styles.label}>Heure de départ</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowTimePicker(true)}
        >
          <Text style={styles.valueText}>
            {time ? formatTime(time) : "Choisir une heure"}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={time || new Date()}
            mode="time"
            is24Hour
            onChange={(_, t) => {
              setShowTimePicker(false);
              if (t) setTime(t);
            }}
          />
        )}

        <Text style={styles.label}>Places</Text>
        <TextInput
          style={styles.input}
          value={places}
          onChangeText={setPlaces}
          keyboardType="numeric"
          placeholder="Nombre de places"
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity style={styles.btnPrimary} onPress={submit} disabled={loading}>
          <Text style={styles.btnText}>
            {loading ? "Publication..." : "Publier le trajet"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ----------------------------
// STYLES (INCHANGÉS)
// ----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  map: { height: 240 },
  form: { padding: 16 },
  label: { color: "#e5e7eb", marginTop: 10 },
  input: {
    backgroundColor: "#1f2933",
    color: "#fff",
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  valueText: { color: "#fff" },
  btnPrimary: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  btnSecondary: {
    backgroundColor: "#374151",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "600" },
});
