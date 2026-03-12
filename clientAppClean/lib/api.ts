// lib/api.ts - VERSION AVEC NGROK

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";


export const API_URL = "https://letsgo-ks54.onrender.com";// ⚠️ À CHANGER !!!

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