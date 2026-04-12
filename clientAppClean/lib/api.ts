// lib/api.ts - VERSION AVEC NGROK

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";


export const API_URL = "https://letsgo-ks54.onrender.com";
console.log("🌐 API URL (ngrok):", API_URL);
console.log("📱 Plateforme:", Platform.OS);

// ==============================
// 🔐 GESTION DU TOKEN
// ==============================

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

// ==============================
// 👤 AUTHENTIFICATION
// ==============================

export async function login(email: string, password: string) {
  try {
    console.log("🔵 Tentative login à:", `${API_URL}/api/auth/login`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        // Important pour ngrok - éviter l'avertissement de tunnel
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ email, password }),
    });

    const text = await response.text();
    console.log("🔵 Login raw response:", text);

    if (!response.ok) {
      let errorMessage = "Erreur de connexion";
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Si ce n'est pas du JSON, garder le message par défaut
      }
      throw new Error(errorMessage);
    }

    const data = JSON.parse(text);
    
    if (data.token) {
      await saveToken(data.token);
      if (data.user) {
        await saveUser(data.user);
      }
    }
    
    return data;
  } catch (error) {
    console.error("❌ Login error:", error);
    throw error;
  }
}

export async function register(payload: {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  residence?: string;
  password: string;
}) {
  try {
    console.log("🔵 Tentative register à:", `${API_URL}/api/auth/register`);
    console.log("📦 Payload original:", payload);

    // Nettoyer le téléphone : supprimer les espaces et tirets
    const cleanPayload = {
      ...payload,
      telephone: payload.telephone ? payload.telephone.replace(/[\s\-]/g, '') : undefined,
    };

    console.log("📦 Payload nettoyé:", cleanPayload);

    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify(cleanPayload),
    });

    const text = await response.text();
    console.log("🔵 Register raw response:", text);

    if (!response.ok) {
      let errorMessage = "Erreur lors de l'inscription";
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("❌ Register error:", error);
    throw error;
  }
}

export async function logout() {
  await removeToken();
  await SecureStore.deleteItemAsync("user");
}

// ==============================
// 🚗 TRAJETS CLIENT
// ==============================

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getToken();
  
  if (!token) {
    throw new Error("Non authentifié");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
      ...options.headers,
    },
  });

  const text = await response.text();
  console.log(`📡 ${options.method || 'GET'} ${endpoint}:`, text);

  if (!response.ok) {
    try {
      const error = JSON.parse(text);
      throw new Error(error.message || "Erreur serveur");
    } catch (e) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }
  }

  return text ? JSON.parse(text) : null;
}

export async function createTrajet(payload: {
  depart?: string;
  destination: string;   // ← changement : arrivee → destination
  date_depart: string;
  heure_depart: string;
  places: number;
}) {
  return fetchWithAuth("/api/client/trajets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMesTrajets() {
  return fetchWithAuth("/api/client/mes-trajets");
}

export async function deleteTrajet(id: number) {
  return fetchWithAuth(`/api/client/trajets/${id}`, {
    method: "DELETE",
  });
}

export async function updateTrajet(id: number, payload: any) {
  return fetchWithAuth(`/api/client/trajets/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function toggleFavori(trajetId: number) {
  return fetchWithAuth(`/api/client/favoris/${trajetId}`, {
    method: "POST",
  });
}

export async function getFavoris() {
  return fetchWithAuth("/api/client/favoris");
}

/// ==============================
// 📝 GESTION DES DEMANDES (planifier.tsx)
// ==============================

export async function creerDemande(payload: {
  depart: string;
  destination: string;
  date_depart: string;
  heure_depart: string;
  places: number;
}) {
  console.log("📤 Envoi de la demande avec payload:", payload);
  console.log("📤 URL:", `${API_URL}/api/client/demandes`);
  
  const result = await fetchWithAuth("/api/client/demandes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  
  console.log("📥 Réponse reçue:", result);
  return result;
}
// Optionnel : récupérer ses demandes
export async function getMesDemandes() { 
  
  return fetchWithAuth("/api/client/mes-demandes");
}

export async function getMesReservations() {
  return fetchWithAuth("/api/client/mes-reservations");
}
export async function reserverTrajet(trip_id: number, places: number) {
  return fetchWithAuth("/api/client/reserver", {
    method: "POST",
    body: JSON.stringify({ trip_id, places }),
  });
}
export async function annulerReservation(reservationId: number) {
  return fetchWithAuth(`/api/client/reservations/${reservationId}`, {
    method: "DELETE",  // ← bien DELETE
  });
}
export async function getMesReservationsInterurbaines() {
  return fetchWithAuth("/api/client/mes-reservations-interurbaines");
}
// ==============================
// 🔍 TEST DE CONNEXION
// ==============================

export async function testNgrokConnection() {
  try {
    console.log("🔍 Test connexion ngrok à:", `${API_URL}/api/test`);
    
    const response = await fetch(`${API_URL}/api/test`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
    });

    const text = await response.text();
    console.log("📦 Réponse test:", text);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = JSON.parse(text);
    console.log("✅ Connexion ngrok OK:", data);
    
    return { success: true, data };
  } catch (error) {
    console.error("❌ Erreur connexion ngrok:", error);
    return { success: false, error };
  }
}
export async function deleteDemande(id: number) {
  return fetchWithAuth(`/api/client/demandes/${id}`, {
    method: "DELETE",
  });
}
export async function updateDemande(id: number, payload: {
  depart: string;
  destination: string;
  date_depart: string;
  heure_depart: string;
  places: number;
}) {
  return fetchWithAuth(`/api/client/demandes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}


// ==============================
// 🌍 GÉOCODAGE (Google Maps)
// ==============================



// lib/api.ts


const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
// ... (gardez vos fonctions existantes : saveToken, login, register, fetchWithAuth, etc.)
console.log("🔑 Clé API lue :", GOOGLE_API_KEY ? "Oui (longueur " + GOOGLE_API_KEY.length + ")" : "NON");
// =============================
// 🌍 GÉOCODAGE (Google Maps)
// ==============================

export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:SN&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lon: lng, display_name: data.results[0].formatted_address };
    } else {
      console.warn("Geocoding error:", data.status);
      return null;
    }
  } catch (error) {
    console.error("Erreur geocodeAddress:", error);
    return null;
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    // 1. Places API (quartier, point d'intérêt)
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=200&types=neighborhood|sublocality|locality|point_of_interest&key=${GOOGLE_API_KEY}`;
    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();
    if (placesData.status === "OK" && placesData.results.length > 0) {
      const place = placesData.results[0];
      if (place.name) return place.name;
    }
    // 2. Fallback Geocoding
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "OK" && data.results.length > 0) {
      const comps = data.results[0].address_components;
      const neighborhood = comps.find(c => c.types.includes("neighborhood"))?.long_name;
      const sublocality = comps.find(c => c.types.includes("sublocality"))?.long_name;
      const locality = comps.find(c => c.types.includes("locality"))?.long_name;
      const parts = [neighborhood, sublocality, locality].filter(Boolean);
      if (parts.length) return parts.join(", ");
      return locality || data.results[0].formatted_address;
    }
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    console.error("Erreur reverseGeocode:", error);
    return null;
  }
}
// ==============================
// 🌍 AUTOCOMPLÉTION (Google Places)
// ==============================

export async function autocompleteAddress(input: string, location?: { lat: number; lon: number }): Promise<Array<{ description: string; placeId: string }>> {
  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&components=country:SN&key=${GOOGLE_API_KEY}`;
    if (location) {
      url += `&location=${location.lat},${location.lon}&radius=50000`;
    }
    console.log("🔍 URL autocomplete:", url);
    const response = await fetch(url);
    const data = await response.json();
    console.log("📦 Statut de la réponse:", data.status);
    console.log("📦 Message d'erreur:", data.error_message);
    console.log("📦 Nombre de prédictions:", data.predictions?.length);
    if (data.status === "OK") {
      return data.predictions.map(p => ({ description: p.description, placeId: p.place_id }));
    } else {
      console.warn("⚠️ Erreur autocomplete:", data.status);
      return [];
    }
  } catch (error) {
    console.error("❌ Erreur réseau:", error);
    return [];
  }
}
export async function getPlaceDetails(placeId: string): Promise<{ lat: number; lon: number; display_name: string } | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === "OK" && data.result) {
      const { lat, lng } = data.result.geometry.location;
      return { lat, lon: lng, display_name: data.result.formatted_address };
    }
    return null;
  } catch (error) {
    console.error("Erreur place details:", error);
    return null;
  }
}
// ==============================
// 🚌 RECHERCHE D'ARRÊTS (autocomplétion depuis la BDD)
// ==============================

export async function searchArrets(query: string): Promise<Array<{
  id: number;
  nom: string;
  latitude: number;
  longitude: number;
}>> {
  try {
    const response = await fetch(
      `${API_URL}/api/transport/arrets/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error("Erreur searchArrets:", error);
    return [];
  }
}