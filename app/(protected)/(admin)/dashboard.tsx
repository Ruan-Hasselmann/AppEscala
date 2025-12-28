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
import {
  getServiceDaysByMonth,
  ServiceDay,
} from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================
   HELPERS
========================= */

async function mapAdminCalendarData(params: {
  serviceDays: ServiceDay[];
  ministries: Ministry[];
}): Promise<CalendarDayData[]> {
  const { serviceDays, ministries } = params;

  if (serviceDays.length === 0 || ministries.length === 0) {
    return [];
  }

  const serviceDayIds = serviceDays.map((d) => d.id);

  /* =========================
     PESSOAS
  ========================= */

  const people = await listPeople();
  const peopleIndex = new Map<string, Person>(
    people.map((p) => [p.id, p])
  );

  /* =========================
     ESCALAS
  ========================= */

  const schedulesByMinistry = await Promise.all(
    ministries.map((m) =>
      listSchedulesByMonth({
        ministryId: m.id,
        serviceDayIds,
      })
    )
  );

  const schedules = schedulesByMinistry.flat();

  /* =========================
     INDEX (DIA + TURNO + MINISTÉRIO)
  ========================= */

  const scheduleIndex = new Map<
    string,
    {
      scheduleId: string;
      status: CalendarServiceStatus;
      people: {
        id: string;
        name: string;
        role: string;
        attendance: "pending" | "confirmed" | "declined";
      }[];
    }
  >();

  schedules.forEach((s) => {
    const key = `${s.serviceDayId}__${s.serviceLabel}__${s.ministryId}`;

    const people =
      s.assignments
        ?.map((a) => {
          const p = peopleIndex.get(a.personId);
          if (!p) return null;

          return {
            id: p.id,
            name: p.name,
            role: "Membro",
            attendance: (a.attendance ?? "pending") as
              | "pending"
              | "confirmed"
              | "declined",
          };
        })
        .filter(
          (
            p
          ): p is {
            id: string;
            name: string;
            role: string;
            attendance: "pending" | "confirmed" | "declined";
          } => p !== null
        ) ?? [];

    scheduleIndex.set(key, {
      scheduleId: s.id,
      status: s.status,
      people,
    });
  });

  /* =========================
     CALENDÁRIO FINAL
  ========================= */

  return Promise.all(
    serviceDays.map(async (day) => {
      const services = await getServicesByServiceDay(day.id);

      return {
        serviceDayId: day.id,
        date: day.date,
        services: services.flatMap((service) =>
          ministries.map((ministry) => {
            const key = `${day.id}__${service.label}__${ministry.id}`;
            const found = scheduleIndex.get(key);

            return {
              turno: service.label,
              ministry: ministry.name,
              ministryId: ministry.id,
              scheduleId: found?.scheduleId ?? "",
              status:
                found?.status ??
                ("empty" as CalendarServiceStatus),
              people: found?.people,
            };
          })
        ),
      };
    })
  );
}

/* =========================
   SCREEN
========================= */

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  const [month, setMonth] = useState(new Date());
  const [calendarData, setCalendarData] =
    useState<CalendarDayData[]>([]);
  const [ministries, setMinistries] =
    useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] =
    useState<CalendarDayData | null>(null);

  /* =========================
     LOAD BASE
  ========================= */

  async function loadBase() {
    const m = await listMinistries();
    setMinistries(m.filter((x) => x.active));
  }

  /* =========================
     LOAD DASHBOARD
  ========================= */

  async function loadDashboard() {
    if (ministries.length === 0) return;

    setLoading(true);

    const days = await getServiceDaysByMonth(month);

    const calendar = await mapAdminCalendarData({
      serviceDays: days,
      ministries,
    });

    setCalendarData(calendar);
    setLoading(false);
  }

  /* =========================
     EFFECTS
  ========================= */

  useFocusEffect(
    useCallback(() => {
      loadBase();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [ministries, month])
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Painel administrativo"
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          {/* HEADER DO MÊS */}
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

          {/* CALENDÁRIO */}
          {loading ? (
            <Text style={styles.loading}>
              Carregando calendário…
            </Text>
          ) : (
            <CalendarDashboard
              month={month}
              data={calendarData}
              onDayPress={(day) => setSelectedDay(day)}
            />
          )}
        </View>
      </ScrollView>

      {/* MODAL DO DIA */}
      <DayOverviewModal
        visible={!!selectedDay}
        day={selectedDay}
        onClose={() => setSelectedDay(null)}
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

  loading: {
    textAlign: "center",
    marginTop: 40,
    fontWeight: "700",
    color: "#6B7280",
  },
});
