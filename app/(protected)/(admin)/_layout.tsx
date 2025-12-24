import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function AdminLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#6B7280",
                tabBarStyle: {
                    height: 80,
                    paddingBottom: 6,
                    paddingTop: 6,
                },
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

            {/* PESSOAS */}
            <Tabs.Screen
                name="people"
                options={{
                    title: "Pessoas",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* CULTOS / SERVICE DAYS */}
            <Tabs.Screen
                name="service-days"
                options={{
                    title: "Cultos",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* CULTOS / SERVICE DAYS */}
            <Tabs.Screen
                name="ministries/ministries"
                options={{
                    title: "Ministérios ",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="ribbon-outline" size={size} color={color} />
                    ),
                }}
            />

            {/* CONFIGURAÇÕES */}
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Config",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="ministries/[ministryId]"
                options={{
                    href: null, // 👈 ESCONDE DO TABS
                }}
            />

        </Tabs>
    );
}