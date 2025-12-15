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
  AvailabilityTurn,
  getUserAvailability,
  setAvailabilityForDay,
} from "../../../src/services/availability";
import { getServiceDays } from "../../../src/services/serviceDays";
import {
  getCalendarDays,
  getMonthKey,
  getMonthName,
  weekDays,
} from "../../../src/utils/calendar";

type ServiceTurn = {
  morning: boolean;
  night: boolean;
};

export default function MemberDashboard() {
  const { user, logout } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthKey = getMonthKey(new Date(year, month));
  const days = getCalendarDays(year, month);

  const [serviceDays, setServiceDays] = useState<Record<string, ServiceTurn>>({});
  const [availability, setAvailability] = useState<
    Record<string, AvailabilityTurn>
  >({});

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedTurns, setSelectedTurns] = useState<AvailabilityTurn>({
    morning: false,
    night: false,
  });
  const [availableTurns, setAvailableTurns] = useState<ServiceTurn>({
    morning: false,
    night: false,
  });
  const [showTurnSelector, setShowTurnSelector] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;

      setServiceDays(await getServiceDays(monthKey));
      setAvailability(await getUserAvailability(user.uid, monthKey));
    }

    load();
  }, [user, monthKey]);

  function prevMonth() {
    setMonth((p) => (p === 0 ? 11 : p - 1));
    if (month === 0) setYear((y) => y - 1);
  }

  function nextMonth() {
    setMonth((p) => (p === 11 ? 0 : p + 1));
    if (month === 11) setYear((y) => y + 1);
  }

  function openModal(date: Date) {
    const dateKey = date.toISOString().split("T")[0];
    const service = serviceDays[dateKey];
    if (!service) return;

    const userTurns = availability[dateKey] ?? {
      morning: false,
      night: false,
    };

    const isSunday = date.getDay() === 0;
    const count =
      (service.morning ? 1 : 0) + (service.night ? 1 : 0);

    setSelectedDateKey(dateKey);
    setSelectedTurns(userTurns);
    setAvailableTurns(service);
    setShowTurnSelector(isSunday && count > 1);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!user || !selectedDateKey) return;

    await setAvailabilityForDay(
      user.uid,
      monthKey,
      selectedDateKey,
      selectedTurns
    );

    setAvailability(await getUserAvailability(user.uid, monthKey));
    setModalVisible(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Disponibilidade</Text>
      <Text style={styles.subtitle}>Selecione quando você pode servir</Text>

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
            { color: "#0073ff", label: "Dia de culto" },
            { color: "#065F46", label: "Disponível" },
            { color: "#E5E7EB", label: "Indisponível" },
          ]}
        />
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      <View style={styles.calendar}>
        {days.map((date, i) => {
          if (!date) return <View key={i} style={styles.empty} />;

          const dateKey = date.toISOString().split("T")[0];
          const service = serviceDays[dateKey];
          const avail = availability[dateKey];
          const hasService = service?.morning || service?.night;
          const isAvailable = avail?.morning || avail?.night;
          const isSunday = date.getDay() === 0;

          return (
            <TouchableOpacity
              key={i}
              disabled={!hasService}
              onPress={() => openModal(date)}
              style={[
                styles.day,
                hasService && styles.serviceDay,
                isAvailable && styles.availableDay,
              ]}
            >
              <Text style={styles.dayNumber}>{date.getDate()}</Text>

              {/* 🔹 Ícones apenas no domingo */}
              {isSunday && isAvailable && (
                <View style={styles.turnsColumn}>
                  {avail.morning && <Text style={styles.turnIcon}>☀️</Text>}
                  {avail.night && <Text style={styles.turnIcon}>🌙</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Definir disponibilidade</Text>

            {showTurnSelector ? (
              <View style={styles.turnSelector}>
                {availableTurns.morning && (
                  <Pressable
                    style={[
                      styles.turnButton,
                      selectedTurns.morning && styles.turnActive,
                    ]}
                    onPress={() =>
                      setSelectedTurns((p) => ({ ...p, morning: !p.morning }))
                    }
                  >
                    <Text style={styles.turnText}>☀️ Manhã</Text>
                  </Pressable>
                )}

                {availableTurns.night && (
                  <Pressable
                    style={[
                      styles.turnButton,
                      selectedTurns.night && styles.turnActive,
                    ]}
                    onPress={() =>
                      setSelectedTurns((p) => ({ ...p, night: !p.night }))
                    }
                  >
                    <Text style={styles.turnText}>🌙 Noite</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable
                style={[
                  styles.turnButton,
                  (selectedTurns.morning || selectedTurns.night) &&
                    styles.turnActive,
                ]}
                onPress={() =>
                  setSelectedTurns({
                    morning: !(selectedTurns.morning || selectedTurns.night),
                    night: false,
                  })
                }
              >
                <Text style={styles.turnTextCentered}>Disponível</Text>
              </Pressable>
            )}

            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#374151", marginBottom: 16 },

  headerBlock: { marginBottom: 12 },
  monthHeader: { flexDirection: "row", justifyContent: "space-between" },
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
  serviceDay: { backgroundColor: "#0073ff" },
  availableDay: { backgroundColor: "#065F46" },

  dayNumber: { fontWeight: "700", marginBottom: 4 },
  turnsColumn: { alignItems: "center", gap: 6 },
  turnIcon: { fontSize: 16, color: "#FFFFFF" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
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

  turnSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  turnButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    minWidth: 120,
  },
  turnActive: { backgroundColor: "#93C5FD" },
  turnText: { textAlign: "center", fontWeight: "600" },
  turnTextCentered: { textAlign: "center", fontWeight: "700" },

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
  logoutText: { color: "#FFFFFF", textAlign: "center", fontWeight: "700" },
});
