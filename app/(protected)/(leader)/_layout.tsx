import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function LeaderLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#6B7280",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {/* DASHBOARD */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="apps-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Escala */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Escala",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Escala */}
      <Tabs.Screen
        name="schedule/generate"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}
