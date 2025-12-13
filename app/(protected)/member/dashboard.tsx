import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import CalendarLegend from "../../../src/components/CalendarLegend";
import { useAuth } from "../../../src/contexts/AuthContext";
import {
  getUserAvailability,
  toggleAvailability,
} from "../../../src/services/availability";
import { getServiceDays } from "../../../src/services/serviceDays";
import {
  getCalendarDays,
  getMonthKey,
  getMonthName,
  weekDays,
} from "../../../src/utils/calendar";

// 🔹 Tipos
type ServiceTurn = {
  morning: boolean;
  night: boolean;
};

type AvailabilityTurn = {
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

  const [serviceDays, setServiceDays] = useState<
    Record<string, ServiceTurn>
  >({});
  const [availability, setAvailability] = useState<
    Record<string, AvailabilityTurn>
  >({});

  useEffect(() => {
    async function load() {
      if (!user) return;

      const services = await getServiceDays(monthKey);
      const avail = await getUserAvailability(user.uid, monthKey);

      setServiceDays(services);
      setAvailability(avail);
    }

    load();
  }, [user, monthKey]);

  async function handleToggleTurn(
    dateKey: string,
    turn: "morning" | "night"
  ) {
    if (!user) return;

    await toggleAvailability(user.uid, monthKey, dateKey, turn);

    setAvailability((prev) => {
      const current = prev[dateKey] || { morning: false, night: false };

      return {
        ...prev,
        [dateKey]: {
          ...current,
          [turn]: !current[turn],
        },
      };
    });
  }

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Disponibilidade</Text>
      <Text style={styles.subtitle}>
        Selecione os turnos em que você pode servir
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
            { color: "#1E3A8A", label: "Dia de culto" },
            { color: "#065F46", label: "Disponível" },
            { color: "#E5E7EB", label: "Indisponível" },
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
          const serviceTurns = serviceDays[dateKey];
          const userTurns = availability[dateKey];

          const hasService =
            serviceTurns?.morning || serviceTurns?.night;

          return (
            <View key={index} style={styles.day}>
              <Text style={styles.dayNumber}>{date.getDate()}</Text>

              {hasService && (
                <View style={styles.turnsColumn}>
                  {serviceTurns.morning && (
                    <TouchableOpacity
                      style={[
                        styles.turnButton,
                        userTurns?.morning && styles.turnActive,
                      ]}
                      onPress={() =>
                        handleToggleTurn(dateKey, "morning")
                      }
                    >
                      <Text style={styles.icon}>☀️</Text>
                    </TouchableOpacity>
                  )}

                  {serviceTurns.night && (
                    <TouchableOpacity
                      style={[
                        styles.turnButton,
                        userTurns?.night && styles.turnActive,
                      ]}
                      onPress={() =>
                        handleToggleTurn(dateKey, "night")
                      }
                    >
                      <Text style={styles.icon}>🌙</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

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
    height: 90,
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
    fontWeight: "700",
    marginBottom: 4,
  },

  turnsColumn: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  turnButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#D1D5DB",
  },

  turnActive: {
    backgroundColor: "#065F46",
  },

  icon: {
    fontSize: 18,
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
