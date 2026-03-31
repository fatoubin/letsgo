import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from "react-native";

import { useRouter } from "expo-router";

// ✅ IMPORT LOGOUT
import { logout } from "../../src/services/api";

import { COLORS } from "../../src/styles/colors";
import { globalStyles } from "../../src/styles/globalStyles";

export default function DriverSettingsScreen() {

  const router = useRouter();

  const handleLogout = () => {

    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler" },
        {
          text: "Oui",
          onPress: async () => {
            try {
              // ✅ Suppression token + user
              await logout();

              // ✅ Redirection propre
              router.replace("/welcome");

            } catch (error) {
              Alert.alert("Erreur", "Impossible de se déconnecter");
            }
          }
        }
      ]
    );

  };

  return (

    <View style={globalStyles.screen}>

      <Text style={styles.title}>
        Paramètres
      </Text>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>
          🔔 Notifications
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>
          🌙 Mode sombre / clair
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item}>
        <Text style={styles.itemText}>
          🔒 Sécurité du compte
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.item, styles.logout]}
        onPress={handleLogout}
      >

        <Text style={[styles.itemText, styles.logoutText]}>
          🚪 Déconnexion
        </Text>

      </TouchableOpacity>

    </View>

  );

}

const styles = StyleSheet.create({

  title:{
    fontSize:24,
    color:COLORS.textLight,
    textAlign:"center",
    marginBottom:30,
    fontWeight:"600"
  },

  item:{
    backgroundColor:"#D1D1D1",
    borderRadius:14,
    padding:18,
    marginBottom:14
  },

  itemText:{
    fontSize:16,
    fontWeight:"500"
  },

  logout:{
    backgroundColor:"#FEE2E2"
  },

  logoutText:{
    color:COLORS.danger,
    fontWeight:"700"
  }

});