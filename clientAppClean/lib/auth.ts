import * as SecureStore from "expo-secure-store";

export async function logout() {
  try {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
  } catch (e) {
    console.warn("Erreur lors de la déconnexion", e);
  }
}
