import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";

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
    <View style={{ alignItems: "center" }}>
      <Ionicons name={name} size={24} color={color} />
      <Text
        style={{
          fontSize: 12,
          marginTop: 4,
          color,
        }}
      >
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
        tabBarStyle: {
          backgroundColor: "#020617",
          borderTopColor: "#1E293B",
          borderTopWidth: 1,
          height: 80,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon name="home" label="Accueil" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon name="search" label="Explorer" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon
              name="notifications"
              label="Notifications"
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="compte"
        options={{
          tabBarIcon: ({ color }) => (
            <TabIcon name="person" label="Compte" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
