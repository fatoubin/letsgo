import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  API_URL,
  geocodeAddress,
  reverseGeocode,
  autocompleteAddress,
  getPlaceDetails,
} from "../../lib/api";

export default function RechercheTransport() {
  const [departSaisi, setDepartSaisi] = useState("");
  const [destinationSaisie, setDestinationSaisie] = useState("");
  const [coordsDepart, setCoordsDepart] = useState(null);
  const [coordsArrivee, setCoordsArrivee] = useState(null);
  const [suggestionsDepart, setSuggestionsDepart] = useState([]);
  const [suggestionsDestination, setSuggestionsDestination] = useState([]);
  const [showDepartSuggestions, setShowDepartSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [geocodingDepart, setGeocodingDepart] = useState(false);
  const [geocodingArrivee, setGeocodingArrivee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultats, setResultats] = useState([]);
  const [positionActuelle, setPositionActuelle] = useState(null);

  const departTimeout = useRef(null);
  const destTimeout = useRef(null);
  const departInputRef = useRef(null);
  const destInputRef = useRef(null);

  // 🔒 Flags pour bloquer l'autocomplétion lors d'une sélection programmatique
  const isSelectingDepart = useRef(false);
  const isSelectingDest = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setPositionActuelle({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
    })();
  }, []);

  // Autocomplétion départ
  useEffect(() => {
    if (departTimeout.current) clearTimeout(departTimeout.current);

    // 🔒 Si sélection programmatique, on ignore et on reset le flag
    if (isSelectingDepart.current) {
      isSelectingDepart.current = false;
      return;
    }

    if (departSaisi.trim().length < 2) {
      setSuggestionsDepart([]);
      setShowDepartSuggestions(false);
      return;
    }
    departTimeout.current = setTimeout(async () => {
      const suggestions = await autocompleteAddress(departSaisi, positionActuelle);
      setSuggestionsDepart(suggestions);
      setShowDepartSuggestions(true);
    }, 500);
    return () => {
      if (departTimeout.current) clearTimeout(departTimeout.current);
    };
  }, [departSaisi, positionActuelle]);

  // Autocomplétion destination
  useEffect(() => {
    if (destTimeout.current) clearTimeout(destTimeout.current);

    // 🔒 Si sélection programmatique, on ignore et on reset le flag
    if (isSelectingDest.current) {
      isSelectingDest.current = false;
      return;
    }

    if (destinationSaisie.trim().length < 2) {
      setSuggestionsDestination([]);
      setShowDestSuggestions(false);
      return;
    }
    destTimeout.current = setTimeout(async () => {
      const suggestions = await autocompleteAddress(destinationSaisie, positionActuelle);
      setSuggestionsDestination(suggestions);
      setShowDestSuggestions(true);
    }, 500);
    return () => {
      if (destTimeout.current) clearTimeout(destTimeout.current);
    };
  }, [destinationSaisie, positionActuelle]);

  const selectSuggestion = useCallback(async (type, suggestion) => {
    if (type === "depart") {
      isSelectingDepart.current = true; // 🔒 Bloquer avant setDepartSaisi
      setShowDepartSuggestions(false);
      setSuggestionsDepart([]);
      setDepartSaisi(suggestion.description);
      setGeocodingDepart(true);
      const details = await getPlaceDetails(suggestion.placeId);
      if (details) {
        setCoordsDepart({ lat: details.lat, lon: details.lon });
      } else {
        const result = await geocodeAddress(suggestion.description);
        if (result) setCoordsDepart({ lat: result.lat, lon: result.lon });
        else Alert.alert("Erreur", "Impossible de localiser ce lieu.");
      }
      setGeocodingDepart(false);
      departInputRef.current?.blur();
    } else {
      isSelectingDest.current = true; // 🔒 Bloquer avant setDestinationSaisie
      setShowDestSuggestions(false);
      setSuggestionsDestination([]);
      setDestinationSaisie(suggestion.description);
      setGeocodingArrivee(true);
      const details = await getPlaceDetails(suggestion.placeId);
      if (details) {
        setCoordsArrivee({ lat: details.lat, lon: details.lon });
      } else {
        const result = await geocodeAddress(suggestion.description);
        if (result) setCoordsArrivee({ lat: result.lat, lon: result.lon });
        else Alert.alert("Erreur", "Impossible de localiser ce lieu.");
      }
      setGeocodingArrivee(false);
      destInputRef.current?.blur();
    }
  }, []);

  const utiliserPositionActuelle = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission refusée", "Activez la localisation.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const lat = loc.coords.latitude;
    const lon = loc.coords.longitude;
    setCoordsDepart({ lat, lon });
    setGeocodingDepart(true);
    const adresse = await reverseGeocode(lat, lon);
    setGeocodingDepart(false);
    isSelectingDepart.current = true; // 🔒 Bloquer avant setDepartSaisi
    setShowDepartSuggestions(false);
    setSuggestionsDepart([]);
    setDepartSaisi(adresse || `${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  }, []);

  const handleRecherche = useCallback(async () => {
    if (!coordsDepart || !coordsArrivee) {
      Alert.alert("Erreur", "Choisissez un départ et une destination valides.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat_depart: coordsDepart.lat,
        lon_depart: coordsDepart.lon,
        lat_arrivee: coordsArrivee.lat,
        lon_arrivee: coordsArrivee.lon,
      }).toString();
      const response = await fetch(`${API_URL}/api/transport/itineraires?${params}`);
      const data = await response.json();
      setResultats(data.itineraires || []);
    } catch (err) {
      Alert.alert("Erreur", "Impossible de trouver un itinéraire.");
    } finally {
      setLoading(false);
    }
  }, [coordsDepart, coordsArrivee]);

  const renderSuggestions = (suggestions, onSelect) => (
    <ScrollView style={styles.suggestionsList} nestedScrollEnabled>
      {suggestions.map((item) => (
        <TouchableOpacity key={item.placeId} style={styles.suggestionItem} onPress={() => onSelect(item)}>
          <Ionicons name="location-outline" size={16} color="#4DA3FF" />
          <Text style={styles.suggestionText}>{item.description}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Rechercher un itinéraire (Urbain)</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Départ</Text>
        <TextInput
          ref={departInputRef}
          style={styles.input}
          placeholder="Ex: Ouakam, Cité Avion"
          placeholderTextColor="#9AA4BF"
          value={departSaisi}
          onChangeText={(text) => {
            setCoordsDepart(null); // Reset coords si l'utilisateur retape
            setDepartSaisi(text);
          }}
          onFocus={() => {
            if (suggestionsDepart.length > 0) setShowDepartSuggestions(true);
          }}
        />
        {showDepartSuggestions && suggestionsDepart.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {renderSuggestions(suggestionsDepart, (item) => selectSuggestion("depart", item))}
          </View>
        )}
        <TouchableOpacity style={styles.locationBtn} onPress={utiliserPositionActuelle}>
          <Ionicons name="locate" size={20} color="#fff" />
          <Text style={styles.locationBtnText}>Ma position</Text>
        </TouchableOpacity>
        {geocodingDepart && <ActivityIndicator size="small" color="#4DA3FF" style={{ marginTop: 8 }} />}
        {coordsDepart && !geocodingDepart && <Text style={styles.successText}>✓ Lieu reconnu</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Destination</Text>
        <TextInput
          ref={destInputRef}
          style={styles.input}
          placeholder="Ex: Place de l'Indépendance"
          placeholderTextColor="#9AA4BF"
          value={destinationSaisie}
          onChangeText={(text) => {
            setCoordsArrivee(null); // Reset coords si l'utilisateur retape
            setDestinationSaisie(text);
          }}
          onFocus={() => {
            if (suggestionsDestination.length > 0) setShowDestSuggestions(true);
          }}
        />
        {showDestSuggestions && suggestionsDestination.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {renderSuggestions(suggestionsDestination, (item) => selectSuggestion("destination", item))}
          </View>
        )}
        {geocodingArrivee && <ActivityIndicator size="small" color="#4DA3FF" style={{ marginTop: 8 }} />}
        {coordsArrivee && !geocodingArrivee && <Text style={styles.successText}>✓ Lieu reconnu</Text>}
      </View>

      <TouchableOpacity
        style={[styles.searchBtn, (!coordsDepart || !coordsArrivee || loading) && styles.disabled]}
        onPress={handleRecherche}
        disabled={!coordsDepart || !coordsArrivee || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Trouver un itinéraire</Text>}
      </TouchableOpacity>

      {resultats.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Itinéraires proposés</Text>
          {resultats.map((item, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.ligne}>Ligne {item.ligne.numero} - {item.ligne.nom}</Text>
              <Text>De {item.depart.nom} à {item.arrivee.nom}</Text>
              <Text>Durée estimée : {item.duree_estimee} min</Text>
              <Text>Prochains départs : {item.horaires.join(", ")}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B132B", padding: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  inputGroup: { marginBottom: 20, position: "relative", zIndex: 1 },
  label: { color: "#9AA4BF", marginBottom: 8 },
  input: { backgroundColor: "#1F2A52", color: "#fff", padding: 12, borderRadius: 10 },
  suggestionsContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#1F2A52",
    borderRadius: 10,
    zIndex: 100,
    elevation: 5,
    maxHeight: 200,
  },
  suggestionsList: { maxHeight: 200 },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#3A4A6E",
  },
  suggestionText: { color: "#fff", marginLeft: 8, fontSize: 14 },
  locationBtn: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8, padding: 8 },
  locationBtnText: { color: "#4DA3FF" },
  successText: { color: "#4ade80", fontSize: 12, marginTop: 4 },
  searchBtn: { backgroundColor: "#2563EB", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600" },
  results: { marginTop: 20 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  card: { backgroundColor: "#1F2A52", borderRadius: 12, padding: 16, marginBottom: 12 },
  ligne: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});