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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  API_URL,
  reverseGeocode,
  searchArrets,
  autocompleteAddress,
  geocodeAddress,
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

  const isSelectingDepart = useRef(false);
  const isSelectingDest = useRef(false);

  // Récupérer position actuelle au démarrage
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        setPositionActuelle({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
    })();
  }, []);

  // Autocomplétion départ — BDD en priorité, Google Places en fallback
  useEffect(() => {
    if (departTimeout.current) clearTimeout(departTimeout.current);
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
      const arrets = await searchArrets(departSaisi);
      if (arrets.length > 0) {
        setSuggestionsDepart(arrets.map(a => ({
          id: a.id,
          nom: a.nom,
          latitude: a.latitude,
          longitude: a.longitude,
          type: "arret",
        })));
      } else {
        const places = await autocompleteAddress(departSaisi, positionActuelle);
        setSuggestionsDepart(places.map(p => ({
          id: p.placeId,
          nom: p.description,
          latitude: null,
          longitude: null,
          type: "place",
          placeId: p.placeId,
        })));
      }
      setShowDepartSuggestions(true);
    }, 300);
    return () => { if (departTimeout.current) clearTimeout(departTimeout.current); };
  }, [departSaisi, positionActuelle]);

  // Autocomplétion destination
  useEffect(() => {
    if (destTimeout.current) clearTimeout(destTimeout.current);
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
      const arrets = await searchArrets(destinationSaisie);
      if (arrets.length > 0) {
        setSuggestionsDestination(arrets.map(a => ({
          id: a.id,
          nom: a.nom,
          latitude: a.latitude,
          longitude: a.longitude,
          type: "arret",
        })));
      } else {
        const places = await autocompleteAddress(destinationSaisie, positionActuelle);
        setSuggestionsDestination(places.map(p => ({
          id: p.placeId,
          nom: p.description,
          latitude: null,
          longitude: null,
          type: "place",
          placeId: p.placeId,
        })));
      }
      setShowDestSuggestions(true);
    }, 300);
    return () => { if (destTimeout.current) clearTimeout(destTimeout.current); };
  }, [destinationSaisie, positionActuelle]);

  const selectItem = useCallback(async (type, item) => {
    if (type === "depart") {
      isSelectingDepart.current = true;
      setDepartSaisi(item.nom);
      setSuggestionsDepart([]);
      setShowDepartSuggestions(false);

      if (item.type === "arret") {
        setCoordsDepart({ lat: item.latitude, lon: item.longitude });
      } else {
        setGeocodingDepart(true);
        const details = await getPlaceDetails(item.placeId);
        if (details) {
          setCoordsDepart({ lat: details.lat, lon: details.lon });
        } else {
          const result = await geocodeAddress(item.nom);
          if (result) setCoordsDepart({ lat: result.lat, lon: result.lon });
          else Alert.alert("Erreur", "Impossible de localiser ce lieu.");
        }
        setGeocodingDepart(false);
      }
      departInputRef.current?.blur();
    } else {
      isSelectingDest.current = true;
      setDestinationSaisie(item.nom);
      setSuggestionsDestination([]);
      setShowDestSuggestions(false);

      if (item.type === "arret") {
        setCoordsArrivee({ lat: item.latitude, lon: item.longitude });
      } else {
        setGeocodingArrivee(true);
        const details = await getPlaceDetails(item.placeId);
        if (details) {
          setCoordsArrivee({ lat: details.lat, lon: details.lon });
        } else {
          const result = await geocodeAddress(item.nom);
          if (result) setCoordsArrivee({ lat: result.lat, lon: result.lon });
          else Alert.alert("Erreur", "Impossible de localiser ce lieu.");
        }
        setGeocodingArrivee(false);
      }
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
    isSelectingDepart.current = true;
    setSuggestionsDepart([]);
    setShowDepartSuggestions(false);
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
      if ((data.itineraires || []).length === 0) {
        Alert.alert("Aucun résultat", data.message || "Aucun itinéraire trouvé entre ces deux points.");
      }
    } catch (err) {
      Alert.alert("Erreur", "Impossible de trouver un itinéraire.");
    } finally {
      setLoading(false);
    }
  }, [coordsDepart, coordsArrivee]);

  const renderSuggestions = (suggestions, onSelect) => (
    <ScrollView style={styles.suggestionsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
      {suggestions.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.suggestionItem}
          onPress={() => onSelect(item)}
        >
          <Ionicons
            name={item.type === "arret" ? "bus-outline" : "location-outline"}
            size={16}
            color={item.type === "arret" ? "#4DA3FF" : "#9AA4BF"}
          />
          <View style={styles.suggestionTextContainer}>
            <Text style={styles.suggestionText}>{item.nom}</Text>
            {item.type === "place" && (
              <Text style={styles.suggestionSubText}>Lieu à proximité</Text>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Rechercher un itinéraire</Text>

      {/* DÉPART */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Départ</Text>
        <TextInput
          ref={departInputRef}
          style={styles.input}
          placeholder="Arrêt ou lieu (ex: Ouakam, Hôpital...)"
          placeholderTextColor="#9AA4BF"
          value={departSaisi}
          onChangeText={(text) => {
            setCoordsDepart(null);
            setDepartSaisi(text);
          }}
          onFocus={() => {
            if (suggestionsDepart.length > 0) setShowDepartSuggestions(true);
          }}
        />
        {showDepartSuggestions && suggestionsDepart.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {renderSuggestions(suggestionsDepart, (item) => selectItem("depart", item))}
          </View>
        )}
        <TouchableOpacity style={styles.locationBtn} onPress={utiliserPositionActuelle}>
          <Ionicons name="locate" size={20} color="#fff" />
          <Text style={styles.locationBtnText}>Ma position</Text>
        </TouchableOpacity>
        {geocodingDepart && <ActivityIndicator size="small" color="#4DA3FF" style={{ marginTop: 8 }} />}
        {coordsDepart && !geocodingDepart && <Text style={styles.successText}>✓ Lieu reconnu</Text>}
      </View>

      {/* DESTINATION */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Destination</Text>
        <TextInput
          ref={destInputRef}
          style={styles.input}
          placeholder="Arrêt ou lieu (ex: UCAD, Place Indépendance...)"
          placeholderTextColor="#9AA4BF"
          value={destinationSaisie}
          onChangeText={(text) => {
            setCoordsArrivee(null);
            setDestinationSaisie(text);
          }}
          onFocus={() => {
            if (suggestionsDestination.length > 0) setShowDestSuggestions(true);
          }}
        />
        {showDestSuggestions && suggestionsDestination.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {renderSuggestions(suggestionsDestination, (item) => selectItem("destination", item))}
          </View>
        )}
        {geocodingArrivee && <ActivityIndicator size="small" color="#4DA3FF" style={{ marginTop: 8 }} />}
        {coordsArrivee && !geocodingArrivee && <Text style={styles.successText}>✓ Lieu reconnu</Text>}
      </View>

      {/* BOUTON RECHERCHE */}
      <TouchableOpacity
        style={[styles.searchBtn, (!coordsDepart || !coordsArrivee || loading) && styles.disabled]}
        onPress={handleRecherche}
        disabled={!coordsDepart || !coordsArrivee || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Trouver un itinéraire</Text>}
      </TouchableOpacity>

      {/* RÉSULTATS */}
      {resultats.length > 0 && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>
            🚍 {resultats.length} itinéraire{resultats.length > 1 ? 's' : ''} trouvé{resultats.length > 1 ? 's' : ''}
          </Text>
          {resultats.map((item, idx) => (
            <TouchableOpacity
              key={`${item.ligne.id}-${item.depart.nom}-${item.arrivee.nom}`}
              style={styles.card}
              onPress={() => {
                // Envoyer toutes les coordonnées nécessaires à la carte
                router.push({
                  pathname: "/transport/bus-map",
                  params: {
                    ligneId: item.ligne.id,
                    ligneNumero: item.ligne.numero,
                    departNom: item.depart.nom,
                    arriveeNom: item.arrivee.nom,
                    departLat: item.depart.lat.toString(),
                    departLon: item.depart.lon.toString(),
                    arriveeLat: item.arrivee.lat.toString(),
                    arriveeLon: item.arrivee.lon.toString(),
                  },
                });
              }}
            >
              <Text style={styles.ligne}>Ligne {item.ligne.numero} — {item.ligne.nom}</Text>
              <Text style={styles.cardText}>De {item.depart.nom} à {item.arrivee.nom}</Text>
              <Text style={styles.cardText}>Durée estimée : {item.duree_estimee} min</Text>
              {item.horaires.length > 0 && (
                <Text style={styles.cardText}>Prochains départs : {item.horaires.join(", ")}</Text>
              )}
            </TouchableOpacity>
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
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#2E3E6E",
  },
  suggestionsList: { maxHeight: 220 },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#3A4A6E",
  },
  suggestionTextContainer: { marginLeft: 8, flex: 1 },
  suggestionText: { color: "#fff", fontSize: 14 },
  suggestionSubText: { color: "#9AA4BF", fontSize: 11, marginTop: 2 },
  locationBtn: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8, padding: 8 },
  locationBtnText: { color: "#4DA3FF" },
  successText: { color: "#4ade80", fontSize: 12, marginTop: 4 },
  searchBtn: { backgroundColor: "#2563EB", padding: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  disabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "600" },
  results: { marginTop: 20, paddingBottom: 40 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  card: { backgroundColor: "#1F2A52", borderRadius: 12, padding: 16, marginBottom: 12 },
  ligne: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 6 },
  cardText: { color: "#9AA4BF", marginTop: 2 },
});