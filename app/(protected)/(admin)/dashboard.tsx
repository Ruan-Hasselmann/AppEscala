// app/(protected)/(admin)/dashboard.tsx
import { useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AppScreen } from "@/src/components/AppScreen";
import { SYSTEM_ROLE_LABEL, useAuth } from "@/src/contexts/AuthContext";
import { AppHeader } from "@/src/components/AppHeader";

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <AppScreen>
      <AppHeader
        title="Painel Administrativo"
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />
      <View style={styles.container}>

        {/* CONTENT */}
        <View style={styles.content}>
          <DashboardCard
            title="Pessoas"
            description="Gerenciar usuários e permissões"
            onPress={() =>
              router.push("/(protected)/(admin)/people")
            }
          />

          <DashboardCard
            title="Ministérios"
            description="Criar e organizar ministérios"
            onPress={() =>
              router.push("/(protected)/(admin)/ministries")
            }
          />

          <DashboardCard
            title="Dias de Culto"
            description="Configurar calendário de cultos"
            onPress={() =>
              router.push("/(protected)/(admin)/service-days")
            }
          />
        </View>
      </View>
    </AppScreen>
  );
}

/* =========================
   COMPONENTS
========================= */

function DashboardCard({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  logoutText: {
    color: "#991B1B",
    fontWeight: "700",
  },

  /* CONTENT */
  content: {
    gap: 12,
  },

  /* CARD */
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#4B5563",
  },
});
