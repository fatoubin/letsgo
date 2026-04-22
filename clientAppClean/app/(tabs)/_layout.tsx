import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const TAB_WIDTH = Dimensions.get("window").width / 4;

function TabIcon({
  name,
  color,
  label,
}: {
  name: any;
  color: string;
  label: string;
}) {
  return (
    <View style={styles.tabIcon}>
      <Ionicons name={name} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarItemStyle: { width: TAB_WIDTH }, // ← force largeur égale
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" label="Accueil" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorer",
          tabBarIcon: ({ color }) => (
            <TabIcon name="search" label="Explorer" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <TabIcon name="notifications" label="Notifs" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="compte"
        options={{
          title: "Compte",
          tabBarIcon: ({ color }) => (
            <TabIcon name="person" label="Compte" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#020617",
    borderTopColor: "#1E293B",
    borderTopWidth: 1,
    height: 65,
    paddingBottom: 6,
    paddingTop: 6,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabIcon: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
    paddingHorizontal: 2,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 3,
    textAlign: "center",
    width: "100%",
  },
});