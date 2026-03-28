import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, Alert } from "react-native";

// 🔔 Handler (important)
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    // 📱 Vérifier appareil réel
    if (!Device.isDevice) {
      Alert.alert(
        "Notifications",
        "Les notifications nécessitent un vrai téléphone"
      );
      return null;
    }

    // 🔐 Permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Notifications",
        "Permission de notifications refusée"
      );
      return null;
    }

    // ✅ TOKEN (corrigé)
    const token = (
      await Notifications.getExpoPushTokenAsync()
    ).data;

    console.log("📱 Token:", token);

    // ⚙️ Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(
        "default",
        {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        }
      );
    }

    return token;

  } catch (error) {
    console.log("❌ Error notifications:", error);
    return null;
  }
}