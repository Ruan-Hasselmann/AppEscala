import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";
import { loadSavedSchedule } from "@/src/services/schedule/loadSavedSchedule";
import { formatDateBR, parseLocalDate } from "@/src/utils/dates";

type MyScheduleItem = {
  date: string;
  slot: "morning" | "night";
  ministryName: string;
  role: string;
};

type CalendarDay = {
  date: string;
  hasMorning: boolean;
  hasNight: boolean;
};

const COLORS = {
  accent: "#2563EB",
  muted: "#6B7280",
  border: "#E5E7EB",
  today: "#F59E0B",
};

export default function MemberScheduleScreen() {
  const { user } = useAuth();

  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<MyScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  /* =========================
     CARREGAR CALENDÁRIO
  ========================= */

  useEffect(() => {
    if (!user) return;

    async function loadCalendar() {
      setLoading(true);

      try {
        // 🔍 varremos todos os dias do mês
        const days: CalendarDay[] = [];

        for (let d = 1; d <= 31; d++) {
          const day = `${month}-${String(d).padStart(2, "0")}`;

          const saved = await loadSavedSchedule(month, day);
          const id = user?.personId;

          const mine = saved.filter(
            (i) => i.personId === id
          );

          if (mine.length === 0) continue;

          days.push({
            date: day,
            hasMorning: mine.some((i) => i.slot === "morning"),
            hasNight: mine.some((i) => i.slot === "night"),
          });
        }

        setCalendarDays(days);
      } finally {
        setLoading(false);
      }
    }

    loadCalendar();
  }, [user]);

  /* =========================
     CLIQUE NO DIA
  ========================= */

  async function handleDayPress(date: string) {
    if (!user) return;

    setSelectedDate(date);
    setItems([]);

    const saved = await loadSavedSchedule(month, date);

    const mine = saved
      .filter((i) => i.personId === user.personId)
      .map((i) => ({
        date,
        slot: i.slot,
        ministryName: i.ministryName,
        role: i.role,
      }));

    setItems(mine);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Minha Escala</Text>

      <Text style={styles.subtitle}>
        Toque em um dia para ver seus detalhes
      </Text>

      {/* CALENDÁRIO */}
      <View style={styles.calendar}>
        {calendarDays.map((day) => {
          const isToday = day.date === today;

          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => handleDayPress(day.date)}
              style={styles.calendarDay}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.todayCircle,
                ]}
              >
                <Text style={styles.dayText}>
                  {parseLocalDate(day.date).getDate()}
                </Text>
              </View>

              <Text style={styles.icons}>
                {day.hasMorning && "☀️"}
                {day.hasNight && "🌙"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* DETALHES */}
      {selectedDate && (
        <View style={styles.details}>
          <Text style={styles.detailsTitle}>
            {formatDateBR(selectedDate)}
          </Text>

          {items.map((item, idx) => (
            <View key={idx} style={styles.row}>
              <Text style={styles.cell}>
                {item.slot === "morning" ? "Manhã" : "Noite"}
              </Text>
              <Text style={styles.cell}>
                {item.ministryName}
              </Text>
              <Text style={[styles.cell, styles.strong]}>
                {item.role}
              </Text>
            </View>
          ))}
        </View>
      )}

      {!loading && calendarDays.length === 0 && (
        <Text style={styles.empty}>
          Você ainda não foi escalado neste mês.
        </Text>
      )}
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: {
    color: COLORS.muted,
    marginBottom: 16,
  },

  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  calendarDay: {
    width: "14.28%",
    alignItems: "center",
    marginBottom: 10,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: {
    borderWidth: 2,
    borderColor: COLORS.today,
  },
  dayText: { color: "#FFF", fontWeight: "700" },
  icons: { fontSize: 10 },

  details: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  cell: { flex: 1 },
  strong: { fontWeight: "800" },

  empty: {
    textAlign: "center",
    color: COLORS.muted,
    marginTop: 40,
  },
});
