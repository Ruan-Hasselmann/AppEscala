import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { CalendarDashboard, CalendarDayData, CalendarServiceStatus } from "@/src/components/CalendarDashboard";
import { useAuth } from "@/src/contexts/AuthContext";
import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { listSchedulesByMonth } from "@/src/services/schedules";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/* =========================
   SCREEN
========================= */

export default function LeaderDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [month, setMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);
  const [person, setPerson] = useState<Person | null>(null);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [selectedMinistryId, setSelectedMinistryId] = useState<string | null>(null);
  const leaderMinistries = useMemo(() => {
    if (!person) return [];

    return person.ministries
      .filter(m => m.role === "leader")
      .map(m => ministries.find(x => x.id === m.ministryId))
      .filter(Boolean) as Ministry[];
  }, [person, ministries]);


  async function loadDashboard() {
    if (!user) return;

    const days = await getServiceDaysByMonth(month);

    if (days.length === 0) {
      setCalendarData([]);
      return;
    }

    const serviceDayIds = days.map(d => d.id);

    // 🔥 BUSCA TODAS AS ESCALAS DO MÊS
    if (!selectedMinistryId) return;
    const schedules = await listSchedulesByMonth({
      ministryId: selectedMinistryId, // líder vê o ministério dele
      serviceDayIds,
    });

    // Indexa schedules por dia + culto
    const scheduleIndex = new Map<
      string,
      {
        status: CalendarServiceStatus;
        people: {
          name: string;
          role: string;
        }[];
      }
    >();

    schedules.forEach((s) => {
      scheduleIndex.set(
        `${s.serviceDayId}__${s.serviceLabel}`,
        {
          status: s.status,
          people: s.people.map(p => ({
            name: p.name,
            role: "Membro", // depois pode evoluir
          })),
        }
      );
    });

    // Monta o calendário
    const calendarData: CalendarDayData[] = await Promise.all(
      days.map(async (day) => {
        const services = await getServicesByServiceDay(day.id);

        return {
          date: day.date,
          serviceDayId: day.id,
          services: services.map((service) => {
            const key = `${day.id}__${service.label}`;
            const found = scheduleIndex.get(key);

            return {
              label: service.label,
              status: found
                ? found.status
                : ("empty" as CalendarServiceStatus),
              people: found?.people,
            };
          }),
        };
      })
    );

    setCalendarData(calendarData);
  }

  useEffect(() => {
    if (leaderMinistries.length > 0 && !selectedMinistryId) {
      setSelectedMinistryId(leaderMinistries[0].id);
    }
  }, [leaderMinistries]);

  useFocusEffect(
    useCallback(() => {
      async function loadBase() {
        if (!user) return;

        const [p, m] = await Promise.all([
          listPeople(),
          listMinistries(),
        ]);

        const me = p.find(x => x.id === user.personId) ?? null;

        setPerson(me);
        setMinistries(m.filter(x => x.active));
      }

      loadBase();
    }, [user])
  );

  useFocusEffect(
    useCallback(() => {
      if (!selectedMinistryId) return;

      loadDashboard();
    }, [selectedMinistryId, month])
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
