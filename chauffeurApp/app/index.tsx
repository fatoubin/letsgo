import { View, Text, StyleSheet } from "react-native";

export default function DriverHome() {
  return (
     <View style={styles.container}>
       <Text style={styles.title}>Espace Chauffeur</Text>
      <Text>Publier un trajet et partager sa position</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
