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

  // 🔒 segurança básica
  if (!user || user.role !== "leader") return null;

  // 📅 Próximo mês (regra do sistema)
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

      if (!period) {
        setAvailabilityStatus("closed");
      } else {
        setAvailabilityStatus(period.status);
      }

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
      <Text style={styles.title}>Dashboard do Líder</Text>
      <Text style={styles.subtitle}>
        Escala do mês de {monthLabel}
      </Text>

      {/* STATUS CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Disponibilidade</Text>

        {availabilityStatus === "open" ? (
          <Text style={[styles.statusText, styles.open]}>
            ✅ Período aberto
          </Text>
        ) : (
          <Text style={[styles.statusText, styles.closed]}>
            🔒 Período fechado
          </Text>
        )}

        <Text style={styles.helperText}>
          Os membros precisam informar a disponibilidade antes
          da geração da escala.
        </Text>
      </View>

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            availabilityStatus !== "open" && styles.disabled,
          ]}
          disabled={availabilityStatus !== "open"}
          onPress={() => {
            // 👉 próxima tela: gerar escala
          }}
        >
          <Text style={styles.primaryText}>
            Gerar escala do ministério
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            // 👉 futura tela: revisar escala existente
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
          ℹ️ O admin irá consolidar todas as escalas
          após a finalização do seu ministério.
        </Text>
      </View>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

  title: { fontSize: 22, fontWeight: "900" },
  subtitle: {
    marginTop: 4,
    color: "#374151",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  cardTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },

  statusText: {
    fontWeight: "800",
    marginBottom: 6,
  },
  open: { color: "#065F46" },
  closed: { color: "#991B1B" },

  helperText: {
    color: "#374151",
    fontSize: 13,
  },

  actions: { gap: 10 },

  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  secondaryBtn: {
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
