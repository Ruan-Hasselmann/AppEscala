import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
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

// 🔹 Tipagem correta dos turnos
type ServiceTurn = {
  morning: boolean;
  night: boolean;
};

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

  // 🔹 Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTurns, setSelectedTurns] = useState<ServiceTurn>({
    morning: false,
    night: false,
  });

  useEffect(() => {
    async function load() {
      const data = await getServiceDays(monthKey);
      setServiceDays(data);
    }
    load();
  }, [monthKey]);

  function prevMonth() {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function nextMonth() {
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  function openModal(date: Date) {
    const dateKey = date.toISOString().split("T")[0];
    const current = serviceDays[dateKey] || { morning: false, night: false };

    setSelectedDate(date);
    setSelectedTurns(current);
    setModalVisible(true);
  }

  async function saveTurns() {
    if (!selectedDate) return;

    const dateKey = selectedDate.toISOString().split("T")[0];
    const current = serviceDays[dateKey] || { morning: false, night: false };

    if (selectedTurns.morning !== current.morning) {
      await toggleServiceDay(monthKey, dateKey, "morning");
    }

    if (selectedTurns.night !== current.night) {
      await toggleServiceDay(monthKey, dateKey, "night");
    }

    const updated = await getServiceDays(monthKey);
    setServiceDays(updated);

    setModalVisible(false);
    setSelectedDate(null);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dias de Culto</Text>
      <Text style={styles.subtitle}>
        Toque em um dia para definir os turnos do culto
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
            { color: "#1E3A8A", label: "Culto manhã" },
            { color: "#4C1D95", label: "Culto noite" },
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
          if (!date) {
            return <View key={index} style={styles.empty} />;
          }

          const dateKey = date.toISOString().split("T")[0];
          const turns = serviceDays[dateKey];
          const hasService = turns?.morning || turns?.night;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                turns?.morning && styles.morningDay,
                turns?.night && styles.nightDay,
                turns?.morning && turns?.night && styles.bothTurns,
              ]}
              onPress={() => openModal(date)}
            >
              <Text
                style={[
                  styles.dayNumber,
                  hasService && { color: "#FFFFFF" },
                ]}
              >
                {date.getDate()}
              </Text>

              {hasService && (
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
            <Text style={styles.modalTitle}>Definir turnos</Text>

            <Pressable
              style={[
                styles.modalButton,
                selectedTurns.morning && styles.modalButtonActive,
              ]}
              onPress={() =>
                setSelectedTurns((p) => ({ ...p, morning: !p.morning }))
              }
            >
              <Text style={styles.modalButtonText}>☀️ Manhã</Text>
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
              <Text style={styles.modalButtonText}>🌙 Noite</Text>
            </Pressable>

            <Pressable style={styles.saveButton} onPress={saveTurns}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setSelectedDate(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  subtitle: {
    color: "#374151",
    marginBottom: 16,
  },

  headerBlock: {
    marginBottom: 12,
  },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  arrow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  arrowText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E3A8A",
  },

  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    textTransform: "capitalize",
    color: "#111827",
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  weekDay: {
    width: "14.28%",
    textAlign: "center",
    fontWeight: "700",
    color: "#374151",
    fontSize: 13,
  },

  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  empty: {
    width: "14.28%",
    height: 52,
  },

  day: {
    width: "14.28%",
    minHeight: 90,
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },

  dayNumber: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },

  turnsColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  icon: {
    fontSize: 18,
  },

  morningDay: {
    backgroundColor: "#1E3A8A",
  },

  nightDay: {
    backgroundColor: "#4C1D95",
  },

  bothTurns: {
    borderWidth: 2,
    borderColor: "#FACC15",
  },

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
  },

  modalButtonActive: {
    backgroundColor: "#1E3A8A",
  },

  modalButtonText: {
    textAlign: "center",
    fontWeight: "600",
    color: "#111827",
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

  cancelButton: {
    marginTop: 8,
    padding: 10,
  },

  cancelButtonText: {
    textAlign: "center",
    color: "#374151",
  },

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
