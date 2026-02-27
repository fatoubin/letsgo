import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<"(client)" | "(driver)" | "auth/login">(
    "auth/login"
  );

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        const userStr = await SecureStore.getItemAsync("user");

        if (!token || !userStr) {
          setRoute("auth/login");
          return;
        }

        const user = JSON.parse(userStr);

        if (user.role === "driver") {
          setRoute("(driver)");
        } else {
          setRoute("(client)");
        }
      } catch (e) {
        setRoute("auth/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={route} />
    </Stack>
  );
}
