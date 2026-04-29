import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { COLORS } from "../styles/colors";

export default function DrawerContent(props: any) {
  const router = useRouter();
  const [userName, setUserName] = React.useState("Chauffeur");
  const [userEmail, setUserEmail] = React.useState("");
  const [userPhone, setUserPhone] = React.useState("");

  React.useEffect(() => {
    const loadUserData = async () => {
      const user = await SecureStore.getItemAsync("user");
      if (user) {
        try {
          const userData = JSON.parse(user);
          setUserName(`${userData.prenom || ""} ${userData.nom || ""}`.trim() || "Chauffeur");
          setUserEmail(userData.email || "");
          setUserPhone(userData.telephone || "");
        } catch (e) {}
      }
    };
    loadUserData();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Déconnecter",
          style: "destructive",
          onPress: async () => {
            // Supprimer tous les tokens et données utilisateur
            await SecureStore.deleteItemAsync("token");
            await SecureStore.deleteItemAsync("user");
            await SecureStore.deleteItemAsync("driverId");
            
            // Rediriger vers l'écran de connexion
            router.replace("/(auth)/driver-login");
          }
        }
      ]
    );
  };

  const navigateTo = (screen: string) => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screen);
  };

  return (
    <DrawerContentScrollView {...props} style={styles.drawerContainer}>
      {/* Profil utilisateur */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Image
            source={require("../../assets/avatar.png")}
            style={styles.avatar}
          />
          <View style={styles.onlineBadge} />
        </View>
        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
        <Text style={styles.userPhone}>{userPhone}</Text>
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Items du menu */}
      <View style={styles.menuItems}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/DriverHome")}>
          <Text style={styles.menuIcon}>🏠</Text>
          <Text style={styles.menuText}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/Profile")}>
          <Text style={styles.menuIcon}>👤</Text>
          <Text style={styles.menuText}>Mon profil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/TripScreen")}>
          <Text style={styles.menuIcon}>📍</Text>
          <Text style={styles.menuText}>Mes trajets</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/Stats")}>
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuText}>Statistiques</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/Request")}>
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuText}>Demandes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/Notifications")}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={styles.menuText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/Settings")}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Paramètres</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo("/(driver)/Aide")}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuText}>Aide</Text>
        </TouchableOpacity>
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Bouton déconnexion */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <View style={styles.logoutIconContainer}>
          <Text style={styles.logoutIcon}>🚪</Text>
        </View>
        <View style={styles.logoutTextContainer}>
          <Text style={styles.logoutText}>Déconnexion</Text>
          <Text style={styles.logoutSubText}>Quitter l'application</Text>
        </View>
      </TouchableOpacity>

      {/* Version de l'application */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Let'sGo version 1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: "#111827",
    marginBottom: 10,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#111827",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: "#374151",
    marginVertical: 10,
    marginHorizontal: 16,
  },
  menuItems: {
    flex: 1,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 16,
    width: 30,
    textAlign: "center",
  },
  menuText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: "#374151",
    borderRadius: 12,
    marginHorizontal: 16,
  },
  logoutIconContainer: {
    width: 40,
    alignItems: "center",
  },
  logoutIcon: {
    fontSize: 22,
  },
  logoutTextContainer: {
    flex: 1,
  },
  logoutText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  logoutSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});