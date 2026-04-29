import { Drawer } from "expo-router/drawer";
import DrawerContent from "../src/components/DrawerContent";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(driver)" />
    </Stack>
  );
}