// services/api.ts - Version CORRIGÉE

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const API_URL = "https://letsgo-ks54.onrender.com";

console.log("🌐 API URL:", API_URL);
console.log("📱 Plateforme:", Platform.OS);

/* =========================
   🔐 TOKEN
========================= */

export async function saveToken(token: string) {
  await SecureStore.setItemAsync("token", token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync("token");
}

export async function removeToken() {
  await SecureStore.deleteItemAsync("token");
}

export async function saveUser(user: any) {
  await SecureStore.setItemAsync("user", JSON.stringify(user));
}

export async function getUser(): Promise<any | null> {
  const user = await SecureStore.getItemAsync("user");
  return user ? JSON.parse(user) : null;
}

/* =========================
   🔑 LOGIN
========================= */

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password })
  });

  const text = await response.text();
  if (!response.ok) throw new Error("Erreur connexion");

  const data = JSON.parse(text);
  if (data.token) {
    await saveToken(data.token);
    await saveUser(data.user);
  }
  return data;
}

export async function logout() {
  await removeToken();
  await SecureStore.deleteItemAsync("user");
}

/* =========================
   AUTH FETCH (avec meilleure gestion d'erreur)
========================= */

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();
  if (!token) throw new Error("Non authentifié");

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    // Lire la réponse comme texte d'abord
    const text = await response.text();
    console.log(`📥 Réponse brute de ${endpoint}:`, text.substring(0, 200));

    // Si la réponse est vide, retourner null
    if (!text || text.trim() === "") {
      console.warn(`⚠️ Réponse vide pour ${endpoint}`);
      return null;
    }

    // Essayer de parser le JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(`❌ Erreur JSON pour ${endpoint}:`, parseError);
      console.error(`❌ Réponse reçue: ${text.substring(0, 500)}`);
      throw new Error(`Erreur serveur: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data?.message || `Erreur HTTP ${response.status}`);
    }

    return data;
    
  } catch (error: any) {
    console.error(`❌ Erreur fetchWithAuth pour ${endpoint}:`, error);
    throw error;
  }
}

/* =========================
   🚗 PROFIL CHAUFFEUR
========================= */

export async function getDriverProfile(driverId: number) {
  return fetchWithAuth(`/api/driver/profile?driver_id=${driverId}`);
}

/* =========================
   🚗 TRAJETS CHAUFFEUR
========================= */

export async function getDriverTrips(driverId: number) {
  return fetchWithAuth(`/api/driver/my_trips?driver_id=${driverId}`);
}

export async function createDriverTrip(payload: {
  driverId: number;
  departure: string;
  destination: string;
  date: string;
  time: string;
  seats: number;
  price: number;
}) {
  console.log("📤 createDriverTrip payload:", payload);
  return fetchWithAuth("/api/trips/create", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// ✅ CORRECTION: Modifier un trajet
export async function updateTrip(payload: {
  trip_id: number;
  departure: string;
  destination: string;
  heure: string;
  seats: number;
}) {
  console.log("📤 updateTrip payload:", payload);
  return fetchWithAuth("/api/trips/update", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// ✅ CORRECTION: Supprimer un trajet
export async function deleteTrip(tripId: number) {
  return fetchWithAuth("/api/trips/delete", {
    method: "POST",
    body: JSON.stringify({ trip_id: tripId })
  });
}

/* =========================
   📥 DEMANDES PASSAGERS
========================= */

export async function getDriverRequests(driverId: number) {
  return fetchWithAuth(`/api/trips/driver_requests?driver_id=${driverId}`);
}

// ✅ CORRECTION: Utiliser la bonne route /api/trips/reservation_action
export async function acceptReservation(reservationId: number) {
  console.log("📤 acceptReservation ID:", reservationId);
  return fetchWithAuth("/api/trips/reservation_action", {
    method: "POST",
    body: JSON.stringify({ reservation_id: reservationId, status: "accepted" })
  });
}

// ✅ CORRECTION: Utiliser la bonne route /api/trips/reservation_action
export async function rejectReservation(reservationId: number) {
  console.log("📤 rejectReservation ID:", reservationId);
  return fetchWithAuth("/api/trips/reservation_action", {
    method: "POST",
    body: JSON.stringify({ reservation_id: reservationId, status: "rejected" })
  });
}

/* =========================
Résevation passager
========================= */

export async function getTripReservations(tripId: number) {
  return fetchWithAuth(`/api/trips/reservations?trip_id=${tripId}`);
}

/* =========================
   📊 STATS CHAUFFEUR
========================= */

export async function getDriverStats(driverId: number) {
  return fetchWithAuth(`/api/driver/stats?driver_id=${driverId}`);
}

export async function getDriverHistory(driverId: number) {
  return fetchWithAuth(`/api/driver/history?driver_id=${driverId}`);
}

/* =========================
   📍 TRACKING CHAUFFEUR
========================= */

export async function updateDriverLocation(driverId: number, lat: number, lng: number) {
  return fetchWithAuth("/api/driver/update_location", {
    method: "POST",
    body: JSON.stringify({ driver_id: driverId, lat, lng })
  });
}

/* =========================
   TEST API
========================= */

export async function testConnection() {
  const response = await fetch(`${API_URL}/api/test`);
  const text = await response.text();
  if (!response.ok) throw new Error("API offline");
  return JSON.parse(text);
}