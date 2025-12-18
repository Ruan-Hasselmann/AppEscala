import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

type NavItem = {
  label: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function AppBottomNav() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user) return null;

  const items = getNavItems(user.role);

  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {items.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <TouchableOpacity
              key={item.label}
              style={styles.item}
              onPress={() => router.push(item.href as any)}
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

/* =========================
   NAV POR ROLE
========================= */

function getNavItems(
  role: "admin" | "leader" | "member"
): NavItem[] {
  switch (role) {
    case "admin":
      return [
        {
          label: "Início",
          href: "/(protected)/(admin)/dashboard",
          icon: "home",
        },
        {
          label: "Pessoas",
          href: "/(protected)/(admin)/people",
          icon: "people",
        },
        {
          label: "Config",
          href: "/(protected)/(admin)/settings",
          icon: "settings",
        },
      ];

    case "leader":
      return [
        {
          label: "Escala",
          href: "/(protected)/(leader)/dashboard",
          icon: "calendar",
        },
        {
          label: "Pessoas",
          href: "/(protected)/(leader)/people",
          icon: "people",
        },
      ];

    default:
      return [
        {
          label: "Agenda",
          href: "/(protected)/(member)/dashboard",
          icon: "calendar",
        },
        {
          label: "Perfil",
          href: "/(protected)/(member)/profile",
          icon: "person",
        },
      ];
  }
}

const styles = StyleSheet.create({
  safeArea: {
    paddingBottom: Platform.OS === "android" ? 24 : 0,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexDirection: "row",
    height: 64,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
