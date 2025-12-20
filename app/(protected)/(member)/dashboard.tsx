import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { loadAvailability } from "@/src/services/availability";
import { loadSavedSchedule } from "@/src/services/schedule/loadSavedSchedule";
import { formatDateBR } from "@/src/utils/dates";

/* =========================
   TYPES
========================= */

type NextSchedule = {
  date: string;
  slot: "morning" | "night";
  ministryName: string;
  role: string;
};

/* =========================
   CONSTANTS
========================= */

const COLORS = {
  accent: "#2563EB",
  muted: "#6B7280",
  border: "#E5E7EB",
  card: "#FFFFFF",
  success: "#16A34A",
};

/* =========================
   COMPONENT
========================= */

export default function MemberDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;
  const authUser = user;

  const [nextSchedule, setNextSchedule] =
    useState<NextSchedule | null>(null);
  const [hasAvailability, setHasAvailability] =
    useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    async function loadData() {
      // 🔹 Próxima escala
      const datesToCheck = Array.from({ length: 31 }).map(
        (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          return d.toISOString().slice(0, 10);
        }
      );

      for (const date of datesToCheck) {
        const items = await loadSavedSchedule(month, date);

        const mine = items.find(
          (i) => i.personName === authUser.name
        );

        if (mine) {
          setNextSchedule({
            date,
            slot: mine.slot,
            ministryName: mine.ministryName,
            role: mine.role,
          });
          break;
        }
      }

      // 🔹 Disponibilidade
      const availability = await loadAvailability(
        authUser.personId
      );

      setHasAvailability(
        Object.keys(availability ?? {}).length > 0
      );
    }

    loadData();
  }, []);

  /* =========================
     RENDER
  ========================= */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>
        Olá, {authUser.name.split(" ")[0]} 👋
      </Text>
      <Text style={styles.subtitle}>
        Aqui está um resumo da sua escala
      </Text>

      {/* PRÓXIMA ESCALA */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Próxima escala
        </Text>

        {nextSchedule ? (
          <>
            <Text style={styles.strong}>
              {formatDateBR(nextSchedule.date)}
            </Text>
            <Text>
              {nextSchedule.ministryName} •{" "}
              {nextSchedule.role}
            </Text>
            <Text style={styles.muted}>
              {nextSchedule.slot === "morning"
                ? "☀️ Manhã"
                : "🌙 Noite"}
            </Text>
          </>
        ) : (
          <Text style={styles.muted}>
            Nenhuma escala futura encontrada
          </Text>
        )}
      </View>

      {/* AÇÕES */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.action}
          onPress={() =>
            router.push(
              "/(protected)/(member)/schedule"
            )
          }
        >
          <Text style={styles.actionTitle}>
            📅 Minha Escala
          </Text>
          <Text style={styles.actionDesc}>
            Veja todas as suas escalas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.action}
          onPress={() =>
            router.push(
              "/(protected)/(member)/availability"
            )
          }
        >
          <Text style={styles.actionTitle}>
            🕒 Disponibilidade
          </Text>
          <Text style={styles.actionDesc}>
            {hasAvailability
              ? "Disponibilidade preenchida"
              : "Preencha sua disponibilidade"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 16,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: "900",
    marginBottom: 8,
  },

  strong: {
    fontWeight: "900",
    fontSize: 16,
  },
  muted: {
    color: COLORS.muted,
  },

  actions: {
    gap: 12,
  },
  action: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionTitle: {
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 4,
  },
  actionDesc: {
    color: COLORS.muted,
  },
});
