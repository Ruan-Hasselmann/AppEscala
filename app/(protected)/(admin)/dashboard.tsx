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

  const [serviceDays, setServiceDays] = useState<Record<string, ServiceTurn>>(
    {}
  );

  // 🔹 Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedTurns, setSelectedTurns] = useState<ServiceTurn>({
    morning: false,
    night: false,
  });
  const [saving, setSaving] = useState(false);

  /* =========================
     LOAD MONTH DATA
  ========================= */

  useEffect(() => {
    async function load() {
      const data = await getServiceDays(monthKey);
      setServiceDays(data);
    }
    load();
  }, [monthKey]);

  /* =========================
     MONTH NAVIGATION
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
     MODAL CONTROL
  ========================= */

  function openSundayModal(date: Date) {
    const dateKey = getDateKey(date);
    const current = serviceDays[dateKey] || {
      morning: false,
      night: false,
    };

    setSelectedDateKey(dateKey);
    setSelectedTurns(current);
    setModalVisible(true);
  }

  async function saveTurns() {
    if (!selectedDateKey) return;

    setSaving(true);

    const current = serviceDays[selectedDateKey] || {
      morning: false,
      night: false,
    };

    if (selectedTurns.morning !== current.morning) {
      await toggleServiceDay(monthKey, selectedDateKey, "morning");
    }

    if (selectedTurns.night !== current.night) {
      await toggleServiceDay(monthKey, selectedDateKey, "night");
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
      <Text style={styles.title}>Dias de Culto</Text>
      <Text style={styles.subtitle}>
        Toque nos dias para definir quando há culto
      </Text>

      <View style={styles.headerBlock}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.arrow}>
            <Text style={styles.arrowText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.monthTitle}>
            {getMonthName(year, month)}
          </Text>

          <TouchableOpacity onPress={nextMonth} style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </TouchableOpacity>
        </View>

        <CalendarLegend
          items={[
            { color: "#0073ffff", label: "Dia de culto" },
            { color: "#E5E7EB", label: "Sem culto" },
          ]}
        />
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((day) => (
          <Text key={day} style={styles.weekDay}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendar}>
        {days.map((date, index) => {
          if (!date) return <View key={index} style={styles.empty} />;

          const dateKey = getDateKey(date);
          const turns = serviceDays[dateKey];
          const hasService = turns?.morning || turns?.night;
          const isSunday = date.getDay() === 0;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.day, hasService && styles.serviceDay]}
              onPress={async () => {
                if (isSunday) {
                  openSundayModal(date);
                } else {
                  await toggleServiceDay(monthKey, dateKey, "morning");
                  const updated = await getServiceDays(monthKey);
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
                  {turns.morning && <Text style={styles.icon}>☀️</Text>}
                  {turns.night && <Text style={styles.icon}>🌙</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 🔹 MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Definir turnos (domingo)</Text>

            <Pressable
              style={[
                styles.modalButton,
                selectedTurns.morning && styles.modalButtonActive,
              ]}
              onPress={() =>
                setSelectedTurns((p) => ({ ...p, morning: !p.morning }))
              }
            >
              <Text>☀️ Manhã</Text>
            </Pressable>

            <Pressable
              style={[
                styles.modalButton,
                selectedTurns.night && styles.modalButtonActive,
              ]}
              onPress={() =>
                setSelectedTurns((p) => ({ ...p, night: !p.night }))
              }
            >
              <Text>🌙 Noite</Text>
            </Pressable>

            <Pressable style={styles.saveButton} onPress={saveTurns}>
              <Text style={styles.saveButtonText}>
                {saving ? "Salvando..." : "Salvar"}
              </Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={closeModal}>
              <Text>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#374151", marginBottom: 16 },
  headerBlock: { marginBottom: 12 },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  arrow: { padding: 8 },
  arrowText: { fontSize: 26, color: "#1E3A8A" },
  monthTitle: { fontSize: 20, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekDay: { width: "14.28%", textAlign: "center", fontWeight: "700" },
  calendar: { flexDirection: "row", flexWrap: "wrap" },
  empty: { width: "14.28%", height: 90 },
  day: {
    width: "14.28%",
    minHeight: 90,
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  serviceDay: { backgroundColor: "#0073ffff" },
  dayNumber: { fontWeight: "700", marginBottom: 4 },
  turnsColumn: { alignItems: "center", gap: 6 },
  icon: { fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
    alignItems: "center",
  },
  modalButtonActive: {
    backgroundColor: "#1E3A8A",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#065F46",
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
  cancelButton: { marginTop: 8, alignItems: "center" },
  logout: {
    marginTop: 16,
    backgroundColor: "#991B1B",
    padding: 14,
    borderRadius: 10,
  },
  logoutText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontWeight: "700",
  },
});
