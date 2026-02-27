import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import io from "socket.io-client";

// ⭐ TON URL NGROK
const API_URL = "https://fredia-coverable-kora.ngrok-free.dev";

const socket = io(API_URL, {
  transports: ["websocket"],
});

export default function App() {
  const [step, setStep] = useState(1);
  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [places, setPlaces] = useState("3");

  const [position, setPosition] = useState(null);
  const [sending, setSending] = useState(false);

  const [clientMatch, setClientMatch] = useState(null);

  // --- Permission GPS ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission refusée", "Impossible d'obtenir la position");
        return;
      }
    })();
  }, []);

  // --- Login chauffeur ---
  const loginDriver = async () => {
    if (!driverId || !password) {
      Alert.alert("Erreur", "Veuillez remplir les champs");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/login-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: driverId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Erreur", data.error);
        return;
      }

      Alert.alert("Connecté !");
      setStep(2);

    } catch (e) {
      Alert.alert("Erreur", "Impossible de contacter le serveur");
    }
  };

  // --- Publier trajet ---
  const sendTrip = () => {
    if (!from || !to) {
      Alert.alert("Erreur", "Complétez le trajet");
      return;
    }

    socket.emit("driverTrip", {
      driverId,
      from,
      to,
      places
    });

    Alert.alert("Trajet envoyé !");
    setStep(3);
  };

  // --- Match client ---
  useEffect(() => {
    socket.on("clientMatch", (client) => {
      setClientMatch(client);
      Alert.alert("Client trouvé", `${client.from} → ${client.to}`);
    });
  }, []);

  const acceptClient = () => {
    socket.emit("driverAccept", {
      driverId,
      client: clientMatch,
    });
    Alert.alert("Client accepté");
  };

  // --- GPS ---
  useEffect(() => {
    if (!sending) return;

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 2,
      },
      (loc) => {
        const coords = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        };

        setPosition(coords);

        socket.emit("driverPosition", {
          id: driverId,
          ...coords,
        });
      }
    );
  }, [sending]);

  // ------------------------------------------------------------------
  // ÉCRAN LOGIN
  // ------------------------------------------------------------------
  if (step === 1) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Connexion Chauffeur</Text>

        <TextInput
          style={styles.input}
          placeholder="Identifiant"
          value={driverId}
          onChangeText={setDriverId}
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button title="Se connecter" onPress={loginDriver} />
      </View>
    );
  }

  // ------------------------------------------------------------------
  // ÉCRAN TRAJET
  // ------------------------------------------------------------------
  if (step === 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Définir votre trajet</Text>

        <TextInput
          style={styles.input}
          placeholder="Départ"
          value={from}
          onChangeText={setFrom}
        />

        <TextInput
          style={styles.input}
          placeholder="Destination"
          value={to}
          onChangeText={setTo}
        />

        <TextInput
          style={styles.input}
          placeholder="Places disponibles"
          value={places}
          onChangeText={setPlaces}
          keyboardType="numeric"
        />

        <Button title="Publier le trajet" onPress={sendTrip} />
      </View>
    );
  }

  // ------------------------------------------------------------------
  // ÉCRAN CARTE
  // ------------------------------------------------------------------
  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        region={
          position
            ? {
                latitude: position.lat,
                longitude: position.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : {
                latitude: 14.6937,
                longitude: -17.4441,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
        }
      >
        {position && (
          <Marker
            coordinate={{
              latitude: position.lat,
              longitude: position.lng,
            }}
            title="Votre position"
            pinColor="blue"
          />
        )}
      </MapView>

      <View style={styles.panel}>
        {!sending ? (
          <Button
            title="Démarrer le GPS"
            onPress={() => setSending(true)}
          />
        ) : (
          <Button
            title="Arrêter le GPS"
            onPress={() => setSending(false)}
          />
        )}

        {clientMatch && (
          <Button title="Accepter le client" onPress={acceptClient} />
        )}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------
// STYLES : SIMPLES ET PROPRES
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  panel: {
    padding: 10,
    backgroundColor: "white",
  },
});
