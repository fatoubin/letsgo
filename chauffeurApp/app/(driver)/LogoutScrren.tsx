import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function LogoutScreen() {

  const router = useRouter();
  const params = useLocalSearchParams();

  const onLogout = params?.onLogout as any;

  useEffect(() => {

    if (onLogout) {
      onLogout();
    }

    router.replace("/welcome");

  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );

}