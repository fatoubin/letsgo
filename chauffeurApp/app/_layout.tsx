import { Drawer } from "expo-router/drawer";
import DrawerContent from "../src/components/DrawerContent";

export default function Layout() {
  return (
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
      <Drawer.Screen name="(driver)/DriverHome" options={{ title: "Accueil" }} />
      <Drawer.Screen name="(driver)/Profile" options={{ title: "Mon profil" }} />
      <Drawer.Screen name="(driver)/TripScreen" options={{ title: "Mes trajets" }} />
      <Drawer.Screen name="(driver)/Stats" options={{ title: "Statistiques" }} />
      <Drawer.Screen name="(driver)/Request" options={{ title: "Demandes" }} />
      <Drawer.Screen name="(driver)/Notifications" options={{ title: "Notifications" }} />
      <Drawer.Screen name="(driver)/Settings" options={{ title: "Paramètres" }} />
      <Drawer.Screen name="(driver)/Aide" options={{ title: "Aide" }} />
    </Drawer>
  );
}