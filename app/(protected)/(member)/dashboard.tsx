import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import {
    CalendarDashboard,
    CalendarDayData,
    CalendarServiceStatus,
} from "@/src/components/CalendarDashboard";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { listSchedulesByMonth } from "@/src/services/schedules";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

/* =========================
   SCREEN
========================= */

export default function MemberDashboard() {
  const { user, logout } = useAuth();

  const [month, setMonth] = useState(new Date());
  const [calendarData, setCalendarData] =
    useState<CalendarDayData[]>([]);
  const [selectedDay, setSelectedDay] =
    useState<CalendarDayData | null>(null);

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  /* =========================
     LOAD BASE
  ========================= */

  async function loadBase() {
    const [m, p] = await Promise.all([
      listMinistries(),
      listPeople(),
    ]);

    setMinistries(m.filter((x) => x.active));
    setPeople(p.filter((x) => x.active));
  }

  /* =========================
     LOAD CALENDAR
  ========================= */

  async function loadCalendar() {
    const days = await getServiceDaysByMonth(month);
    if (days.length === 0) {
      setCalendarData([]);
      return;
    }

    const serviceDayIds = days.map((d) => d.id);

    // 🔥 todas as escalas do mês
    const schedulesByMinistry = await Promise.all(
      ministries.map((m) =>
        listSchedulesByMonth({
          ministryId: m.id,
          serviceDayIds,
        })
      )
    );

    const schedules = schedulesByMinistry.flat();

    // indexa por DIA + TURNO
    const scheduleIndex = new Map<
      string,
      {
        status: CalendarServiceStatus;
        people: { name: string; ministry: string }[];
      }
    >();

    schedules.forEach((s: any) => {
      const ministry = ministries.find(
        (m) => m.id === s.ministryId
      );

      const assignments = s.assignments ?? [];

      const mappedPeople = assignments
        .map((a: { personId: string }) => {
          const p = people.find((x) => x.id === a.personId);
          if (!p) return null;

          return {
            name: p.name,
            ministry: ministry?.name ?? "",
          };
        })
        .filter(Boolean) as { name: string; ministry: string }[];

      const key = `${s.serviceDayId}__${s.serviceLabel}`;

      scheduleIndex.set(key, {
        status: s.status,
        people: mappedPeople,
      });
    });

    const calendar: CalendarDayData[] = await Promise.all(
      days.map(async (day) => {
        const services = await getServicesByServiceDay(day.id);

        return {
          date: day.date,
          serviceDayId: day.id,
          services: services.map((service) => {
            const key = `${day.id}__${service.label}`;
            const found = scheduleIndex.get(key);

            return {
              turno: service.label,
              ministry: "",
              status: found
                ? found.status
                : ("empty" as CalendarServiceStatus),
              people: found?.people,
            };
          }),
        };
      })
    );

    setCalendarData(calendar);
  }

  /* =========================
     EFFECTS
  ========================= */

  useEffect(() => {
    loadBase();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (ministries.length === 0) return;
      loadCalendar();
    }, [ministries, month])
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Minha Escala"
        subtitle={`${user?.name} · Membro`}
        onLogout={logout}
      />

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

      <ScrollView>
        <View style={styles.container}>
          <CalendarDashboard
            month={month}
            data={calendarData}
            onDayPress={(day) => setSelectedDay(day)}
          />
        </View>
      </ScrollView>

      {/* MODAL CENTRAL — VISÃO MEMBRO */}
      <Modal visible={!!selectedDay} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {selectedDay?.date.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </Text>

            {selectedDay?.services.map((s, i) => (
              <View key={i} style={styles.serviceBlock}>
                <View style={styles.serviceHeader}>
                  <Text style={styles.turno}>{s.turno}</Text>
                  <Text
                    style={[
                      styles.status,
                      s.status === "published" &&
                        styles.published,
                      s.status === "draft" && styles.draft,
                    ]}
                  >
                    {s.status === "published"
                      ? "Publicado"
                      : s.status === "draft"
                      ? "Rascunho"
                      : "Sem escala"}
                  </Text>
                </View>

                {s.people && s.people.length > 0 ? (
                  s.people.map((p, idx) => (
                    <Text key={idx} style={styles.person}>
                      • {p.name} — {p.ministry}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.empty}>
                    Nenhuma pessoa escalada
                  </Text>
                )}
              </View>
            ))}

            <Pressable
              style={styles.close}
              onPress={() => setSelectedDay(null)}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  nav: { fontSize: 28, fontWeight: "800" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "capitalize",
  },

  serviceBlock: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingBottom: 8,
  },

  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  turno: { fontWeight: "800" },

  status: { fontWeight: "800" },
  published: { color: "#16A34A" },
  draft: { color: "#F59E0B" },

  person: {
    fontSize: 13,
    marginLeft: 8,
    color: "#374151",
  },

  empty: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },

  close: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  closeText: { color: "#FFF", fontWeight: "800" },
});
