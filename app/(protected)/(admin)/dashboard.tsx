import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import CalendarLegend from "../../../src/components/CalendarLegend";
import { useAuth } from "../../../src/contexts/AuthContext";
import {
  getServiceDays,
  toggleServiceDay,
} from "../../../src/services/serviceDays";
import {
  getCalendarDays,
  getMonthKey,
  getMonthName,
  weekDays,
} from "../../../src/utils/calendar";

/* =========================
   TYPES
========================= */

type ServiceTurn = {
  morning: boolean;
  night: boolean;
};

/* =========================
   UTILS
========================= */

function getDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* =========================
   COMPONENT
========================= */

export default function AdminDashboard() {
  const { logout } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthKey = getMonthKey(new Date(year, month));
  const days = getCalendarDays(year, month);

  const [serviceDays, setServiceDays] = useState<
    Record<string, ServiceTurn>
  >({});

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateKey, setSelectedDateKey] =
    useState<string | null>(null);
  const [selectedTurns, setSelectedTurns] =
    useState<ServiceTurn>({
      morning: false,
      night: false,
    });

  const [saving, setSaving] = useState(false);

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    async function load() {
      const data = await getServiceDays(monthKey);
      setServiceDays(data);
    }
    load();
  }, [monthKey]);

  /* =========================
     MONTH NAV
  ========================= */

  function prevMonth() {
    setMonth((prev) => (prev === 0 ? 11 : prev - 1));
    if (month === 0) setYear((y) => y - 1);
  }

  function nextMonth() {
    setMonth((prev) => (prev === 11 ? 0 : prev + 1));
    if (month === 11) setYear((y) => y + 1);
  }

  /* =========================
     MODAL
  ========================= */

  function openSundayModal(date: Date) {
    const key = getDateKey(date);
    const current = serviceDays[key] ?? {
      morning: false,
      night: false,
    };

    setSelectedDateKey(key);
    setSelectedTurns(current);
    setModalVisible(true);
  }

  async function saveTurns() {
    if (!selectedDateKey) return;

    setSaving(true);

    const current = serviceDays[selectedDateKey] ?? {
      morning: false,
      night: false,
    };

    if (selectedTurns.morning !== current.morning) {
      await toggleServiceDay(
        monthKey,
        selectedDateKey,
        "morning"
      );
    }

    if (selectedTurns.night !== current.night) {
      await toggleServiceDay(
        monthKey,
        selectedDateKey,
        "night"
      );
    }

    const updated = await getServiceDays(monthKey);
    setServiceDays(updated);

    setSaving(false);
    closeModal();
  }

  function closeModal() {
    setModalVisible(false);
    setSelectedDateKey(null);
    setSelectedTurns({ morning: false, night: false });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Dias de Culto</Text>
        <Text style={styles.subtitle}>
          Configure os dias em que haverá culto no mês
        </Text>
      </View>

      {/* MONTH NAV */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {getMonthName(year, month)}
        </Text>

        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <CalendarLegend
        items={[
          { color: "#2563EB", label: "Dia com culto" },
          { color: "#E5E7EB", label: "Sem culto" },
        ]}
      />

      {/* WEEK HEADER */}
      <View style={styles.weekRow}>
        {weekDays.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      {/* CALENDAR */}
      <View style={styles.calendar}>
        {days.map((date, index) => {
          if (!date) {
            return <View key={index} style={styles.empty} />;
          }

          const key = getDateKey(date);
          const turns = serviceDays[key];
          const hasService =
            turns?.morning || turns?.night;
          const isSunday = date.getDay() === 0;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                hasService && styles.serviceDay,
              ]}
              onPress={async () => {
                if (isSunday) {
                  openSundayModal(date);
                } else {
                  await toggleServiceDay(
                    monthKey,
                    key,
                    "morning"
                  );
                  const updated =
                    await getServiceDays(monthKey);
                  setServiceDays(updated);
                }
              }}
            >
              <Text
                style={[
                  styles.dayNumber,
                  hasService && { color: "#111827" },
                ]}
              >
                {date.getDate()}
              </Text>

              {isSunday && hasService && (
                <View style={styles.turnsColumn}>
                  {turns.morning && (
                    <Text style={styles.icon}>☀️</Text>
                  )}
                  {turns.night && (
                    <Text style={styles.icon}>🌙</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Definir turnos (domingo)
            </Text>

            <Pressable
              style={[
                styles.modalBtn,
                selectedTurns.morning &&
                styles.modalBtnActive,
              ]}
              onPress={() =>
                setSelectedTurns((p) => ({
                  ...p,
                  morning: !p.morning,
                }))
              }
            >
              <Text>☀️ Manhã</Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalBtn,
                selectedTurns.night &&
                styles.modalBtnActive,
              ]}
              onPress={() =>
                setSelectedTurns((p) => ({
                  ...p,
                  night: !p.night,
                }))
              }
            >
              <Text>🌙 Noite</Text>
            </Pressable>

            <Pressable
              style={[
                styles.saveBtn,
                saving && { opacity: 0.6 },
              ]}
              onPress={saveTurns}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? "Salvando..." : "Salvar"}
              </Text>
            </Pressable>

            <Pressable
              style={styles.cancelBtn}
              onPress={closeModal}
            >
              <Text>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

  header: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6B7280", marginTop: 4 },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: { padding: 10 },
  navText: { fontSize: 26, color: "#1E3A8A" },
  monthTitle: { fontSize: 18, fontWeight: "800" },

  weekRow: { flexDirection: "row", marginBottom: 6 },
  weekDay: {
    width: "14.28%",
    textAlign: "center",
    fontWeight: "700",
  },

  calendar: { flexDirection: "row", flexWrap: "wrap" },
  empty: { width: "14.28%", height: 86 },

  day: {
    width: "14.28%",
    minHeight: 86,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
    alignItems: "center",
    padding: 4,
  },
  serviceDay: { backgroundColor: "#2563EB" },

  dayNumber: { fontWeight: "700", marginBottom: 4 },
  turnsColumn: { alignItems: "center", gap: 4 },
  icon: { fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
  },
  modalBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
    alignItems: "center",
  },
  modalBtnActive: { backgroundColor: "#1E3A8A" },

  saveBtn: {
    marginTop: 12,
    backgroundColor: "#065F46",
    padding: 12,
    borderRadius: 10,
  },
  saveText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "800",
  },
  cancelBtn: { marginTop: 8, alignItems: "center" },
});
