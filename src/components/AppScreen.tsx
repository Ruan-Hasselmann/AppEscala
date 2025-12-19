import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useState } from "react";
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../contexts/AuthContext";
import AppBottomNav from "./AppBottomNav";

type Props = {
  children: ReactNode;
  scroll?: boolean;
};

export default function AppScreen({ children, scroll = true }: Props) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* =========================
         HEADER
      ========================= */}
      {user && (
        <View style={styles.header}>
          <View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>
              {user.role === "admin"
                ? "Administrador"
                : user.role === "leader"
                ? "Líder"
                : "Membro"}
            </Text>
          </View>

          <Pressable
            onPress={() => setMenuOpen((p) => !p)}
            style={styles.avatar}
          >
            <Ionicons name="person-circle" size={36} color="#1E3A8A" />
          </Pressable>
        </View>
      )}

      {/* =========================
         CONTENT
      ========================= */}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.container}>{children}</View>
      )}

      {/* =========================
         PROFILE MENU
      ========================= */}
      {menuOpen && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menu}>
            <Pressable
              style={styles.menuItem}
              onPress={async () => {
                setMenuOpen(false);
                await logout();
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#991B1B" />
              <Text style={styles.menuTextDanger}>Sair</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* =========================
         BOTTOM NAV
      ========================= */}
      <AppBottomNav />
    </SafeAreaView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  userName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  userRole: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },

  avatar: {
    padding: 4,
  },

  /* CONTENT */
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 0,
    paddingBottom: 96,
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 0,
  },

  /* MENU */
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },

  menu: {
    marginTop: Platform.OS === "android" ? 60 : 80,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 6,
    width: 160,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
  },

  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  menuTextDanger: {
    fontWeight: "700",
    color: "#991B1B",
  },
});
