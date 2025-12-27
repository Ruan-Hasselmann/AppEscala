import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import {
  CalendarDashboard,
  CalendarDayData,
  CalendarServiceStatus,
} from "@/src/components/CalendarDashboard";
import { DayOverviewModal } from "@/src/components/DayOverviewModal";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { listSchedulesByMonth } from "@/src/services/schedules";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";

import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================
   SCREEN
========================= */

export default function LeaderDashboard() {
  const { user, logout } = useAuth();

  const [month, setMonth] = useState(new Date());
  const [calendarData, setCalendarData] =
    useState<CalendarDayData[]>([]);

  const [person, setPerson] = useState<Person | null>(null);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  /* =========================
     PEOPLE INDEX
  ========================= */

  const peopleIndex = useMemo(() => {
    const map = new Map<string, Person>();
    allPeople.forEach((p) => map.set(p.id, p));
    return map;
  }, [allPeople]);

  /* =========================
     LEADER MINISTRIES
  ========================= */

  const leaderMinistries = useMemo(() => {
    if (!person) return [];

    return person.ministries
      .filter((m) => m.role === "leader")
      .map((m) => ministries.find((x) => x.id === m.ministryId))
      .filter(Boolean) as Ministry[];
  }, [person, ministries]);

  /* =========================
     LOAD BASE
  ========================= */

  useFocusEffect(
    useCallback(() => {
      async function loadBase() {
        if (!user) return;

        const [p, m] = await Promise.all([
          listPeople(),
          listMinistries(),
        ]);

        const me = p.find((x) => x.id === user.personId) ?? null;

        setAllPeople(p.filter((x) => x.active));
        setPerson(me);
        setMinistries(m.filter((x) => x.active));
      }

      loadBase();
    }, [user])
  );

  /* =========================
     LOAD DASHBOARD
  ========================= */

  async function loadDashboard() {
    if (!user || leaderMinistries.length === 0) return;

    const days = await getServiceDaysByMonth(month);
    if (days.length === 0) {
      setCalendarData([]);
      return;
    }

    const serviceDayIds = days.map((d) => d.id);

    const schedulesByMinistry = await Promise.all(
      leaderMinistries.map((m) =>
        listSchedulesByMonth({
          ministryId: m.id,
          serviceDayIds,
        })
      )
    );

    const schedules = schedulesByMinistry.flat();

    const scheduleIndex = new Map<
      string,
      {
        status: CalendarServiceStatus;
        ministryName: string;
        people: {
          id: string;
          name: string;
          role: string;
          attendance: "pending" | "confirmed" | "declined";
        }[];
        attendanceSummary: {
          declined: number;
          pending: number;
          confirmed: number;
        };
      }
    >();

    schedules.forEach((s: any) => {
      const ministry = ministries.find(
        (m) => m.id === s.ministryId
      );

      const assignments = s.assignments ?? [];

      const people = assignments
        .map((a: any) => {
          const p = peopleIndex.get(a.personId);
          if (!p) return null;

          return {
            id: p.id,
            name: p.name,
            role: "Membro",
            attendance: a.attendance ?? "pending",
          };
        })
        .filter(Boolean);

      const attendanceSummary = {
        declined: 0,
        pending: 0,
        confirmed: 0,
      };

      assignments.forEach((a: any) => {
        if (a.attendance === "declined") attendanceSummary.declined++;
        else if (a.attendance === "confirmed") attendanceSummary.confirmed++;
        else attendanceSummary.pending++;
      });

      scheduleIndex.set(
        `${s.serviceDayId}__${s.ministryId}__${s.serviceLabel}`,
        {
          status: s.status,
          ministryName: ministry?.name ?? "Ministério",
          people,
          attendanceSummary,
        }
      );
    });

    const calendar: CalendarDayData[] = await Promise.all(
      days.map(async (day) => {
        const services = await getServicesByServiceDay(day.id);

        return {
          date: day.date,
          serviceDayId: day.id,
          services: services.flatMap((service) =>
            leaderMinistries.map((ministry) => {
              const key = `${day.id}__${ministry.id}__${service.label}`;
              const found = scheduleIndex.get(key);

              return {
                turno: service.label,
                ministry: ministry.name,
                status: found
                  ? found.status
                  : ("empty" as CalendarServiceStatus),
                people: found?.people,
                attendanceSummary: found?.attendanceSummary,
              };
            })
          ),
        };
      })
    );

    setCalendarData(calendar);
  }

  /* =========================
     EFFECT
  ========================= */

  useFocusEffect(
    useCallback(() => {
      if (leaderMinistries.length === 0) return;
      loadDashboard();
    }, [leaderMinistries, month])
  );

  function handleDayPress(day: CalendarDayData) {
    setSelectedDay(day);
    setShowDayModal(true);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Painel do Líder"
        subtitle={`${user?.name} · Líder`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          <View style={styles.monthHeader}>
            <Pressable
              onPress={() =>
                setMonth(
                  new Date(
                    month.getFullYear(),
                    month.getMonth() - 1,
                    1
                  )
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
                  new Date(
                    month.getFullYear(),
                    month.getMonth() + 1,
                    1
                  )
                )
              }
            >
              <Text style={styles.nav}>▶</Text>
            </Pressable>
          </View>

          <CalendarDashboard
            month={month}
            data={calendarData}
            onDayPress={handleDayPress}
          />
        </View>
      </ScrollView>

      <DayOverviewModal
        visible={showDayModal}
        day={selectedDay}
        mode="leader"
        onClose={() => {
          setShowDayModal(false);
          setSelectedDay(null);
        }}
      />
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

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
});
