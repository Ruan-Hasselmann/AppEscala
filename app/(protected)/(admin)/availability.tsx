import { useEffect, useMemo, useState } from "react";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    AvailabilityPeriod,
    getAvailabilityPeriod,
    saveAvailabilityPeriod,
} from "../../../src/services/availabilityPeriods";
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

export default function AdminAvailability() {
  const targetDate = useMemo(() => getNextMonth(), []);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const monthKey = getMonthKey(targetDate);
  const monthLabel = getMonthName(year, month);

  const [form, setForm] = useState<AvailabilityPeriod>({
    monthKey,
    opensAtDay: 20,
    closesAtDay: 25,
    status: "closed",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    async function load() {
      const data = await getAvailabilityPeriod(monthKey);
      if (data) setForm(data);
      setLoading(false);
    }
    load();
  }, [monthKey]);

  /* =========================
     ACTIONS
  ========================= */

  async function toggleStatus() {
    const nextStatus = form.status === "open" ? "closed" : "open";

    setSaving(true);
    await saveAvailabilityPeriod({
      ...form,
      status: nextStatus,
    });
    setForm((p) => ({ ...p, status: nextStatus }));
    setSaving(false);
  }

  async function saveDays() {
    setSaving(true);
    await saveAvailabilityPeriod(form);
    setSaving(false);
  }

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
      <Text style={styles.title}>
        Disponibilidade — {monthLabel}
      </Text>

      <Text style={styles.subtitle}>
        Libere o período para os membros informarem quando podem servir
      </Text>

      {/* INFO */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📅 Esta disponibilidade se refere ao mês de{" "}
          <Text style={{ fontWeight: "900" }}>{monthLabel}</Text>.
        </Text>

        <Text style={styles.infoText}>
          Os membros poderão informar sua disponibilidade somente
          enquanto o período estiver aberto.
        </Text>
      </View>

      {/* START DAY */}
      <Text style={styles.label}>
        Disponibilidade começa no dia
      </Text>
      <DaysSelector
        value={form.opensAtDay}
        onChange={(d) =>
          setForm((p) => ({ ...p, opensAtDay: d }))
        }
      />

      {/* END DAY */}
      <Text style={styles.label}>
        Disponibilidade encerra no dia
      </Text>
      <DaysSelector
        value={form.closesAtDay}
        onChange={(d) =>
          setForm((p) => ({ ...p, closesAtDay: d }))
        }
      />

      {/* SAVE DAYS */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={saveDays}
        disabled={saving}
      >
        <Text style={styles.saveText}>
          {saving ? "Salvando..." : "Salvar dias"}
        </Text>
      </TouchableOpacity>

      {/* OPEN / CLOSE */}
      <TouchableOpacity
        style={[
          styles.actionBtn,
          form.status === "open"
            ? styles.close
            : styles.open,
        ]}
        onPress={toggleStatus}
        disabled={saving}
      >
        <Text style={styles.actionText}>
          {form.status === "open"
            ? "Fechar disponibilidade"
            : "Liberar disponibilidade"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* =========================
   DAY SELECTOR
========================= */

function DaysSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (d: number) => void;
}) {
  return (
    <View style={styles.daysGrid}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            value === day && styles.dayActive,
          ]}
          onPress={() => onChange(day)}
        >
          <Text
            style={[
              styles.dayText,
              value === day && { color: "#FFFFFF" },
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      ))}
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
    marginBottom: 12,
  },

  infoBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    color: "#111827",
    marginBottom: 4,
  },

  label: {
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 6,
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCell: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  dayActive: {
    backgroundColor: "#1E3A8A",
  },
  dayText: {
    fontWeight: "800",
    color: "#111827",
  },

  saveBtn: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  actionBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
  },
  open: {
    backgroundColor: "#065F46",
  },
  close: {
    backgroundColor: "#991B1B",
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },
});