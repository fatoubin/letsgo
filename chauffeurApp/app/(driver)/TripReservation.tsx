import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Alert,
  FlatList,
  TouchableOpacity
} from "react-native";

import MapView, { Marker, Polyline } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Magnetometer } from "expo-sensors";

import { API_URL } from "../../src/services/api";

const GOOGLE_MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? "";

type Passenger = {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  places: number;
  status: string;
  latitude?: number;
  longitude?: number;
  pickup_address?: string;
};

// Coordonnées par défaut (Dakar)
const DEFAULT_COORDS = {
  latitude: 14.6937,
  longitude: -17.4441
};

export default function TripReservationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const trip = params.trip ? JSON.parse(String(params.trip)) : null;
  const tripId = params.tripId ? Number(params.tripId) : trip?.id;

  const mapRef = useRef<MapView | null>(null);

  const [driverId, setDriverId] = useState<number | null>(null);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [heading, setHeading] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPassenger, setSelectedPassenger] = useState<Passenger | null>(null);

  useEffect(() => {
    const load = async () => {
      const stored = await SecureStore.getItemAsync("driverId");
      if (stored) setDriverId(Number(stored));
      await loadPassengers();
    };
    load();
  }, []);

  // Boussole
  useEffect(() => {
    const sub = Magnetometer.addListener(data => {
      const angle = Math.atan2(data.y, data.x) * (180 / Math.PI);
      setHeading(angle >= 0 ? angle : angle + 360);
    });
    return () => sub.remove();
  }, []);

  // GPS chauffeur
  useEffect(() => {
    let sub: Location.LocationSubscription;

    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission GPS refusée");
        return;
      }

      sub = await Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.High, 
          timeInterval: 3000,
          distanceInterval: 10
        },
        async loc => {
          const pos = { 
            latitude: loc.coords.latitude, 
            longitude: loc.coords.longitude 
          };
          setDriverLocation(pos);

          try {
            const token = await SecureStore.getItemAsync("token");
            await fetch(`${API_URL}/api/driver/update_location`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ 
                driver_id: driverId, 
                lat: pos.latitude, 
                lng: pos.longitude 
              })
            });
          } catch (e) {
            console.log("❌ Erreur envoi position:", e);
          }

          if (mapRef.current) {
            mapRef.current.animateCamera({ 
              center: pos, 
              heading, 
              zoom: 17, 
              pitch: 45 
            });
          }
        }
      );
    };

    startWatching();
    return () => { if (sub) sub.remove(); };
  }, [heading, driverId]);

  // Charger les passagers ayant réservé ce trajet
  const loadPassengers = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("token");
      
      // Récupérer les réservations du trajet
      const response = await fetch(`${API_URL}/api/trips/reservations?trip_id=${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.log("❌ Erreur chargement réservations");
        setPassengers([]);
        return;
      }
      
      const reservations = await response.json();
      console.log("📥 Réservations reçues:", reservations);
      
      // Transformer les réservations en passagers avec coordonnées
      const passengersList: Passenger[] = (reservations || []).map((res: any, index: number) => {
        // Simuler des positions différentes pour chaque passager
        // Dans la vraie application, ces coordonnées viendraient du backend
        const offsetLat = (index * 0.01) - 0.02;
        const offsetLng = (index * 0.008) - 0.015;
        
        return {
          id: res.id,
          nom: res.nom || "Passager",
          prenom: res.prenom || `Voyageur ${index + 1}`,
          telephone: res.telephone || "Non renseigné",
          places: res.places || 1,
          status: res.status || "pending",
          latitude: DEFAULT_COORDS.latitude + offsetLat,
          longitude: DEFAULT_COORDS.longitude + offsetLng,
          pickup_address: res.pickup_address || "Lieu de prise en charge"
        };
      });
      
      setPassengers(passengersList);
      console.log(`✅ ${passengersList.length} passagers chargés`);
      
    } catch (error) {
      console.log("❌ Erreur chargement passagers:", error);
      setPassengers([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculer l'itinéraire entre le chauffeur et le passager sélectionné
  const fetchRouteToPassenger = async (passenger: Passenger) => {
    if (!driverLocation) {
      console.log("⚠️ Position du chauffeur non disponible");
      return;
    }
    
    if (!passenger.latitude || !passenger.longitude) {
      console.log("⚠️ Position du passager non disponible");
      return;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${passenger.latitude},${passenger.longitude}&mode=driving&key=${GOOGLE_MAPS_KEY}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.routes?.length) {
        const points = decodePolyline(json.routes[0].overview_polyline.points);
        setRouteCoords(points);
      } else {
        console.log("❌ Aucun itinéraire trouvé");
        setRouteCoords([]);
      }
    } catch (e) {
      console.log("❌ Erreur calcul itinéraire:", e);
      setRouteCoords([]);
    }
  };

  // Changer le passager sélectionné
  const selectPassenger = (passenger: Passenger) => {
    setSelectedPassenger(passenger);
    fetchRouteToPassenger(passenger);
    
    // Centrer la carte sur le passager si ses coordonnées sont valides
    if (mapRef.current && passenger.latitude && passenger.longitude) {
      mapRef.current.animateToRegion({
        latitude: passenger.latitude,
        longitude: passenger.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "accepted": return "#10B981";
      case "rejected": return "#EF4444";
      default: return "#F59E0B";
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case "accepted": return "Acceptée";
      case "rejected": return "Refusée";
      default: return "En attente";
    }
  };

  // Vérifier si les coordonnées sont valides
  const isValidCoordinate = (lat?: number, lng?: number): boolean => {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
  };

  // Obtenir les coordonnées de la carte (chauffeur ou défaut)
  const getMapInitialRegion = () => {
    if (driverLocation && isValidCoordinate(driverLocation.latitude, driverLocation.longitude)) {
      return {
        latitude: driverLocation.latitude,
        longitude: driverLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      };
    }
    return {
      latitude: DEFAULT_COORDS.latitude,
      longitude: DEFAULT_COORDS.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05
    };
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement des passagers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getMapInitialRegion()}
      >
        {/* Chauffeur - afficher seulement si position valide */}
        {driverLocation && isValidCoordinate(driverLocation.latitude, driverLocation.longitude) && (
          <Marker coordinate={driverLocation} rotation={heading} flat>
            <View style={styles.driverMarker}>
              <Text style={styles.driverIcon}>🚗</Text>
              <Text style={styles.markerLabel}>Vous</Text>
            </View>
          </Marker>
        )}

        {/* Passagers - afficher seulement si coordonnées valides */}
        {passengers.map((passenger) => {
          if (!isValidCoordinate(passenger.latitude, passenger.longitude)) return null;
          
          return (
            <Marker
              key={passenger.id}
              coordinate={{ 
                latitude: passenger.latitude!, 
                longitude: passenger.longitude! 
              }}
              onPress={() => selectPassenger(passenger)}
            >
              <View style={[styles.passengerMarker, { borderColor: getStatusColor(passenger.status) }]}>
                <Text style={styles.passengerIcon}>👤</Text>
                <Text style={styles.markerLabel}>{passenger.prenom}</Text>
              </View>
            </Marker>
          );
        })}

        {/* Itinéraire vers passager sélectionné */}
        {routeCoords.length > 0 && selectedPassenger && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={5}
            strokeColor="#2563EB"
          />
        )}
      </MapView>

      {/* Liste des passagers */}
      {passengers.length > 0 && (
        <View style={styles.passengerList}>
          <Text style={styles.listTitle}>👥 Passagers ({passengers.length})</Text>
          <FlatList
            data={passengers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.passengerCard,
                  selectedPassenger?.id === item.id && styles.passengerCardSelected
                ]}
                onPress={() => selectPassenger(item)}
              >
                <Text style={styles.passengerName}>{item.prenom} {item.nom}</Text>
                <Text style={styles.passengerInfo}>📞 {item.telephone}</Text>
                <Text style={styles.passengerInfo}>💺 {item.places} place(s)</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

function decodePolyline(encoded: string) {
  const points: any[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#1a1a2e"
  },
  loadingText: { marginTop: 10, color: "#fff" },
  driverMarker: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 20,
    padding: 5,
    borderWidth: 2,
    borderColor: "#fff"
  },
  driverIcon: { fontSize: 24 },
  passengerMarker: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 5,
    borderWidth: 2,
  },
  passengerIcon: { fontSize: 20 },
  markerLabel: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  passengerList: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 16,
    padding: 12,
    margin: 16,
    maxHeight: 150
  },
  listTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
    paddingLeft: 4
  },
  passengerCard: {
    backgroundColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    width: 150,
  },
  passengerCardSelected: {
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  passengerName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4
  },
  passengerInfo: {
    color: "#9CA3AF",
    fontSize: 11,
    marginBottom: 2
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 6
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600"
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  }
});