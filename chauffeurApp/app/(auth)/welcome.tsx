import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { globalStyles } from "../../src/styles/globalStyles";
import { buttons } from "../../src/styles/button";
import { COLORS } from "../../src/styles/colors";

export default function WelcomeScreen() {

  const router = useRouter();

  return (

    <SafeAreaView style={globalStyles.screen}>

      <View style={{ flex:1, justifyContent:"center" }}>

        <Text
          style={[
            globalStyles.text,
            { textAlign:"center", marginBottom:40 }
          ]}
        >
          Avec LetsGo voyager dans une autre dimension
        </Text>

        <TouchableOpacity
          style={buttons.primary}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={buttons.primaryText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[buttons.primary,{ marginTop:12 }]}
          onPress={() => router.push("/RegisterStep1")}
        >
          <Text style={buttons.primaryText}>Créer un compte</Text>
        </TouchableOpacity>
        
      </View>

    </SafeAreaView>
  );
}