import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";

// ✅ IMPORT LOGOUT
import { logout } from "../../src/services/api";

export default function LogoutScreen() {

  const router = useRouter();

  useEffect(() => {

    const handleLogout = async () => {
      try {
        // ✅ suppression token + user
        await logout();
      } catch (e) {
        console.log("LOGOUT ERROR", e);
      } finally {
        // ✅ redirection
        router.replace("/welcome");
      }
    };

    handleLogout();

  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );

}