import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";

import { loadAvailability, saveAvailability } from "@/src/services/availability";
import { loadScheduleSlots } from "@/src/services/schedule/adapters/loadScheduleSlots";
import { formatDateBR } from "@/src/utils/dates";

/* =========================
   TYPES
========================= */

type DayAvailability = {
  morning?: boolean;
  night?: boolean;
};

type DaySlots = {
  date: string;
  morning?: boolean;
  night?: boolean;
};

/* =========================
   CONSTANTS
========================= */

const COLORS = {
  accent: "#2563EB",
  muted: "#6B7280",
  border: "#E5E7EB",
  active: "#16A34A",
};

/* =========================
   COMPONENT
========================= */

export default function MemberAvailabilityScreen() {
  const { user } = useAuth();
  if (!user) return null;

  // 🔒 garante null-safety para TS
  const authUser = user;

  const [days, setDays] = useState<DaySlots[]>([]);
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({});
  const [saving, setSaving] = useState(false);

  const month = new Date().toISOString().slice(0, 7);

  /* =========================
     LOAD DATA
  ========================= */

  useEffect(() => {
    async function loadData() {
      // 🔹 Dias de culto
      const slots = await loadScheduleSlots(month);

      const dayMap: Record<string, DaySlots> = {};
      slots.forEach((s) => {
        dayMap[s.date] ??= { date: s.date };
        dayMap[s.date][s.slot] = true;
      });

      setDays(Object.values(dayMap));

      // 🔹 Disponibilidade salva
      const saved = await loadAvailability(authUser.personId);
      setAvailability(saved ?? {});
    }

    loadData();
  }, []);

  /* =========================
     TOGGLE
  ========================= */

  function toggle(date: string, slot: "morning" | "night") {
    setAvailability((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [slot]: !prev[date]?.[slot],
      },
    }));
  }

  /* =========================
     SAVE
  ========================= */

  async function handleSave() {
    setSaving(true);

    try {
      for (const [date, slots] of Object.entries(availability)) {
        await saveAvailability({
          personId: authUser.personId,
          date,
          morning: !!slots.morning,
          night: !!slots.night,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Disponibilidade</Text>
      <Text style={styles.subtitle}>
        Selecione os dias e turnos que você pode servir
      </Text>

      {days.map((day) => (
        <View key={day.date} style={styles.card}>
          <Text style={styles.date}>
            {formatDateBR(day.date)}
          </Text>

          <View style={styles.slots}>
            {day.morning && (
              <TouchableOpacity
                onPress={() => toggle(day.date, "morning")}
                style={[
                  styles.slot,
                  availability[day.date]?.morning &&
                    styles.active,
                ]}
              >
                <Text style={styles.slotText}>☀️ Manhã</Text>
              </TouchableOpacity>
            )}

            {day.night && (
              <TouchableOpacity
                onPress={() => toggle(day.date, "night")}
                style={[
                  styles.slot,
                  availability[day.date]?.night &&
                    styles.active,
                ]}
              >
                <Text style={styles.slotText}>🌙 Noite</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        style={styles.saveButton}
      >
        <Text style={styles.saveText}>
          {saving ? "Salvando..." : "Salvar disponibilidade"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

  title: {
    fontSize: 22,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 16,
  },

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  date: {
    fontWeight: "900",
    marginBottom: 8,
  },
  slots: {
    flexDirection: "row",
    gap: 8,
  },
  slot: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  active: {
    backgroundColor: COLORS.active,
    borderColor: COLORS.active,
  },
  slotText: {
    fontWeight: "700",
  },

  saveButton: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  saveText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "900",
  },
});
