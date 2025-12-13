import AppScreen from "@/src/components/AppScreen";
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
import { saveSchedule } from "../../../src/services/schedules";
import { getServiceDays } from "../../../src/services/serviceDays";
import { getMembersByMinistry } from "../../../src/services/users";
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

type Member = {
  id: string;
  name: string;
};

export default function LeaderDashboard() {
  const { user, logout } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const monthKey = getMonthKey(new Date(year, month));
  const days = getCalendarDays(year, month);

  const [serviceDays, setServiceDays] = useState<Record<string, ServiceTurn>>(
    {}
  );
  const [members, setMembers] = useState<Member[]>([]);

  // 🔹 Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedTurn, setSelectedTurn] = useState<"morning" | "night">(
    "morning"
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [showTurnSelector, setShowTurnSelector] = useState(false);
  const [availableTurns, setAvailableTurns] = useState<ServiceTurn>({
    morning: false,
    night: false,
  });

  useEffect(() => {
    async function load() {
      if (!user?.ministryId) return;

      const services = await getServiceDays(monthKey);
      const membersList = await getMembersByMinistry(user.ministryId);

      setServiceDays(services);
      setMembers(membersList);
    }

    load();
  }, [user, monthKey]);

  function prevMonth() {
    setMonth((prev) => (prev === 0 ? 11 : prev - 1));
    if (month === 0) setYear((y) => y - 1);
  }

  function nextMonth() {
    setMonth((prev) => (prev === 11 ? 0 : prev + 1));
    if (month === 11) setYear((y) => y + 1);
  }

  function openModal(date: Date) {
    const dateKey = date.toISOString().split("T")[0];
    const turns = serviceDays[dateKey];
    if (!turns) return;

    const isSunday = date.getDay() === 0;

    let defaultTurn: "morning" | "night" = "morning";
    let showSelector = false;

    if (isSunday) {
      const count =
        (turns.morning ? 1 : 0) + (turns.night ? 1 : 0);

      if (count > 1) {
        showSelector = true;
        defaultTurn = "morning";
      } else if (turns.night) {
        defaultTurn = "night";
      }
    }

    setSelectedDateKey(dateKey);
    setSelectedTurn(defaultTurn);
    setSelectedUserId(null);
    setAvailableTurns(turns);
    setShowTurnSelector(showSelector);
    setModalVisible(true);
  }

  async function handleSave() {
    if (!user?.ministryId || !selectedDateKey || !selectedUserId) return;

    await saveSchedule(
      user.ministryId,
      monthKey,
      selectedDateKey,
      selectedTurn,
      selectedUserId
    );

    setModalVisible(false);
  }

  return (
    <AppScreen>
      <Text style={styles.title}>Escala do Ministério</Text>
      <Text style={styles.subtitle}>
        Toque apenas em dias com culto para escalar membros
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

          const dateKey = date.toISOString().split("T")[0];
          const turns = serviceDays[dateKey];
          const hasService = turns?.morning || turns?.night;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.day, hasService && styles.serviceDay]}
              disabled={!hasService}
              onPress={() => openModal(date)}
            >
              <Text style={styles.dayNumber}>{date.getDate()}</Text>

              {date.getDay() === 0 && hasService && (
                <View style={styles.turnsColumn}>
                  {turns.morning && <Text>☀️</Text>}
                  {turns.night && <Text>🌙</Text>}
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
            <Text style={styles.modalTitle}>Montar escala</Text>

            {showTurnSelector && (
              <View style={styles.turnSelector}>
                {availableTurns.morning && (
                  <Pressable
                    style={[
                      styles.turnButton,
                      selectedTurn === "morning" && styles.turnActive,
                    ]}
                    onPress={() => setSelectedTurn("morning")}
                  >
                    <Text>☀️ Manhã</Text>
                  </Pressable>
                )}

                {availableTurns.night && (
                  <Pressable
                    style={[
                      styles.turnButton,
                      selectedTurn === "night" && styles.turnActive,
                    ]}
                    onPress={() => setSelectedTurn("night")}
                  >
                    <Text>🌙 Noite</Text>
                  </Pressable>
                )}
              </View>
            )}

            <ScrollView style={{ maxHeight: 220 }}>
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  style={[
                    styles.memberItem,
                    selectedUserId === member.id &&
                      styles.memberSelected,
                  ]}
                  onPress={() => setSelectedUserId(member.id)}
                >
                  <Text>{member.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[
                styles.saveButton,
                !selectedUserId && { opacity: 0.5 },
              ]}
              disabled={!selectedUserId}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Salvar escala</Text>
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
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#374151", marginBottom: 16 },
  headerBlock: { marginBottom: 12 },
  monthHeader: {
    flexDirection: "row",
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
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  turnActive: { backgroundColor: "#1E3A8A" },
  memberItem: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginBottom: 6,
  },
  memberSelected: { backgroundColor: "#93C5FD" },
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
