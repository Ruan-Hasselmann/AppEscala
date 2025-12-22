// src/app/(leader)/dashboard.tsx
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import {
    listMembershipsByPerson,
    Membership,
} from "@/src/services/memberships";

/* =========================
   COMPONENT
========================= */

export default function LeaderDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    if (!user) return;

    async function load() {
      setLoading(true);
      const data = await listMembershipsByPerson(user.uid);

      setMemberships(
        data.filter(
          (m) =>
            m.role === "leader" && m.status === "active"
        )
      );
      setLoading(false);
    }

    load();
  }, [user]);

  /* =========================
     RENDER
  ========================= */

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Carregando…</Text>
      </View>
    );
  }

  if (memberships.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          Nenhum ministério atribuído
        </Text>
        <Text style={styles.subtitle}>
          Você ainda não é líder de nenhum ministério.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel do Líder</Text>
      <Text style={styles.subtitle}>
        Selecione um ministério
      </Text>

      {memberships.map((m) => (
        <View key={m.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {m.ministryName}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: "/(leader)/calendar",
                params: { ministryId: m.ministryId },
              })
            }
          >
            <Text style={styles.buttonText}>
              Calendário de cultos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() =>
              router.push({
                pathname: "/(leader)/people",
                params: { ministryId: m.ministryId },
              })
            }
          >
            <Text style={styles.buttonSecondaryText}>
              Pessoas do ministério
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonSecondary}
            onPress={() =>
              router.push({
                pathname: "/(leader)/schedule",
                params: { ministryId: m.ministryId },
              })
            }
          >
            <Text style={styles.buttonSecondaryText}>
              Escala
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6B7280",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
  buttonSecondary: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonSecondaryText: {
    fontWeight: "800",
    textAlign: "center",
    color: "#111827",
  },
});
