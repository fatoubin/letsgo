import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import DrawerContent from "../../src/components/DrawerContent";

export default function DriverLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: 280,
            backgroundColor: "#1F2937",
          },
        }}
      >
        <Drawer.Screen name="DriverHome" options={{ title: "Accueil" }} />
        <Drawer.Screen name="TripScreen" options={{ title: "Mes trajets" }} />
        <Drawer.Screen name="Stats" options={{ title: "Statistiques" }} />
        <Drawer.Screen name="Request" options={{ title: "Demandes" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}