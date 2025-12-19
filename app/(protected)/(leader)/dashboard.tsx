import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import { getAvailabilityPeriod } from "../../../src/services/availabilityPeriods";
import { getMonthKey, getMonthName } from "../../../src/utils/calendar";

/* =========================
   HELPERS
========================= */

function getNextMonth(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 1);
}

/* =========================
   COMPONENT
========================= */

export default function LeaderDashboard() {
  const { user } = useAuth();

  if (!user || user.role !== "leader") return null;

  const targetDate = useMemo(() => getNextMonth(), []);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const monthKey = getMonthKey(targetDate);
  const monthLabel = getMonthName(year, month);

  const [availabilityStatus, setAvailabilityStatus] =
    useState<"open" | "closed" | "unknown">("unknown");

  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    async function load() {
      const period = await getAvailabilityPeriod(monthKey);
      setAvailabilityStatus(period?.status ?? "closed");
      setLoading(false);
    }

    load();
  }, [monthKey]);

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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>Escala do Ministério</Text>
      <Text style={styles.subtitle}>
        Planejamento de {monthLabel}
      </Text>

      {/* STATUS CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Disponibilidade dos membros</Text>

        {availabilityStatus === "open" ? (
          <Text style={[styles.statusText, styles.statusOpen]}>
            ✅ Período aberto
          </Text>
        ) : (
          <Text style={[styles.statusText, styles.statusClosed]}>
            🔒 Período fechado
          </Text>
        )}

        <Text style={styles.helperText}>
          Os membros precisam informar a disponibilidade antes da
          geração da escala.
        </Text>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            availabilityStatus !== "open" && styles.disabled,
          ]}
          disabled={availabilityStatus !== "open"}
          onPress={() => {
            // próxima tela: gerar escala
          }}
        >
          <Text style={styles.primaryText}>
            Gerar escala do ministério
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            // próxima tela: visualizar escala existente
          }}
        >
          <Text style={styles.secondaryText}>
            Ver escala atual
          </Text>
        </TouchableOpacity>
      </View>

      {/* INFO */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Após finalizar a escala do seu ministério, o admin irá
          consolidar a escala geral do mês.
        </Text>
      </View>
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
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 4,
    color: "#6B7280",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
    color: "#111827",
  },

  statusText: {
    fontWeight: "900",
    marginBottom: 6,
  },

  statusOpen: {
    color: "#065F46",
  },

  statusClosed: {
    color: "#991B1B",
  },

  helperText: {
    color: "#374151",
    fontSize: 13,
  },

  actions: {
    gap: 10,
  },

  primaryButton: {
    backgroundColor: "#065F46",
    paddingVertical: 14,
    borderRadius: 12,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  secondaryButton: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 12,
  },

  secondaryText: {
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  disabled: {
    opacity: 0.5,
  },

  infoBox: {
    marginTop: 20,
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 12,
  },

  infoText: {
    color: "#1E3A8A",
    fontWeight: "700",
    fontSize: 13,
  },
});
