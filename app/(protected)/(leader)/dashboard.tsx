import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { CalendarDashboard, CalendarDayData, CalendarServiceStatus } from "@/src/components/CalendarDashboard";
import { useAuth } from "@/src/contexts/AuthContext";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/* =========================
   SCREEN
========================= */

export default function LeaderDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [month, setMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);

  async function loadDashboard() {
    const days = await getServiceDaysByMonth(month);

    const calendarData = await Promise.all(
      days.map(async (day) => {
        const services = await getServicesByServiceDay(day.id);

        return {
          date: day.date,
          services: services.map((s) => ({
            label: s.label,
            status: "pending" as CalendarServiceStatus, // depois vira draft / published
          })),
        };
      })
    );

    setCalendarData(calendarData);
  }

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [month])
  );

  return (
    <AppScreen>
      <AppHeader
        title="Painel do Líder"
        subtitle={`${user?.name} · Líder`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          {/* MÊS */}
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() - 1, 1)
                )
              }
            >
              <Text style={styles.nav}>◀</Text>
            </Pressable>

            <Text style={styles.monthTitle}>
              {month.toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </Text>

            <Pressable
              onPress={() =>
                setMonth(
                  new Date(month.getFullYear(), month.getMonth() + 1, 1)
                )
              }
            >
              <Text style={styles.nav}>▶</Text>
            </Pressable>
          </View>

          {/* CALENDÁRIO (VISUALIZAÇÃO) */}
          <CalendarDashboard month={month} data={calendarData} />
        </View>
      </ScrollView>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  nav: {
    fontSize: 28,
    fontWeight: "800",
  },

  manageBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },

  manageText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
