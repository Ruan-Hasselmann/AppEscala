import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/src/contexts/AuthContext";

/* =========================
   HEADER
========================= */

export function AppHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = getInitials(user?.name);

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.container}>
        {/* ESQUERDA */}
        <View>
          <Text style={styles.appName}>Escala</Text>
          <Text style={styles.userInfo}>
            {user?.name} • {labelByRole(user?.role)}
          </Text>
        </View>

        {/* DIREITA */}
        <View style={{ position: "relative" }}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setMenuOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </TouchableOpacity>

          {menuOpen && (
            <View style={styles.menu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                }}
              >
                <Ionicons name="person-outline" size={18} color="#111827" />
                <Text style={styles.menuText}>Meu perfil</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={async () => {
                  setMenuOpen(false);
                  await logout();
                }}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color="#DC2626"
                />
                <Text style={[styles.menuText, { color: "#DC2626" }]}>
                  Sair
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

/* =========================
   HELPERS
========================= */

function labelByRole(role?: string) {
  switch (role) {
    case "admin":
      return "Administrador";
    case "leader":
      return "Líder";
    case "member":
      return "Membro";
    default:
      return "";
  }
}

function getInitials(name?: string) {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (
    parts[0][0].toUpperCase() +
    parts[parts.length - 1][0].toUpperCase()
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  safe: {
    backgroundColor: "#FFFFFF",
    zIndex: 10,
  },

  container: {
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  appName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  userInfo: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  menu: {
    position: "absolute",
    top: 44,
    right: 0,
    width: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },

    elevation: 8,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 6,
  },
});
