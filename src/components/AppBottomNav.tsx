import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";

type Role = "admin" | "leader" | "member";

type NavItem = {
  label: string;
  href: string; // 👈 string livre (rotas futuras OK)
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: Record<Role, NavItem[]> = {
  member: [
    {
      label: "Início",
      href: "/(protected)/(member)/dashboard",
      icon: "home-outline",
    },
    {
      label: "Agenda",
      href: "/(protected)/(member)/calendar", // 🔮 futura
      icon: "calendar-outline",
    },
    {
      label: "Perfil",
      href: "/(protected)/profile", // 🔮 futura
      icon: "person-outline",
    },
  ],

  leader: [
    {
      label: "Início",
      href: "/(protected)/(leader)/dashboard",
      icon: "home-outline",
    },
    {
      label: "Membros",
      href: "/(protected)/(leader)/members",
      icon: "people-outline",
    },
    {
      label: "Escalas",
      href: "/(protected)/(leader)/schedules", // 🔮 futura
      icon: "calendar-outline",
    },
    {
      label: "Perfil",
      href: "/(protected)/profile", // 🔮 futura
      icon: "person-outline",
    },
  ],

  admin: [
    {
      label: "Início",
      href: "/(protected)/(admin)/dashboard",
      icon: "home-outline",
    },
    {
      label: "Ministérios",
      href: "/(protected)/(admin)/ministries", // 🔮 futura
      icon: "layers-outline",
    },
    {
      label: "Usuários",
      href: "/(protected)/(admin)/users", // 🔮 futura
      icon: "people-outline",
    },
    {
      label: "Config",
      href: "/(protected)/(admin)/settings", // 🔮 futura
      icon: "settings-outline",
    },
  ],
};

export default function AppBottomNav() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const items = NAV_ITEMS[user.role];

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {items.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <TouchableOpacity
              key={item.label}
              style={styles.item}
              onPress={() => router.push(item.href as any)} // 👈 cast consciente
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={active ? "#1E3A8A" : "#6B7280"}
              />
              <Text style={[styles.label, active && styles.activeLabel]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    paddingBottom: Platform.OS === "android" ? 24 : 0,
  },

  container: {
    flexDirection: "row",
    height: 64,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },

  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  activeLabel: {
    color: "#1E3A8A",
    fontWeight: "700",
  },
});
