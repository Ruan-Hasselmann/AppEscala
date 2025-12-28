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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================
   HELPERS
========================= */

function statusLabel(status: CalendarServiceStatus) {
  if (status === "published") return "Publicado";
  if (status === "draft") return "Rascunho";
  return "Sem escala";
}

/* =========================
   SCREEN
========================= */

export default function MemberDashboard() {
  const { user, logout } = useAuth();

  const [month, setMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDayData[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  /* =========================
     INDEXES
  ========================= */

  const ministryIndex = useMemo(() => {
    const map = new Map<string, Ministry>();
    ministries.forEach((m) => map.set(m.id, m));
    return map;
  }, [ministries]);

  const peopleIndex = useMemo(() => {
    const map = new Map<string, Person>();
    people.forEach((p) => map.set(p.id, p));
    return map;
  }, [people]);

  /* =========================
     LOAD BASE
  ========================= */

  async function loadBase() {
    const [m, p] = await Promise.all([listMinistries(), listPeople()]);

    setMinistries(m.filter((x) => x.active));
    setPeople(p.filter((x) => x.active));
  }

  /* =========================
     LOAD CALENDAR
  ========================= */

  async function loadCalendar() {
    const days = await getServiceDaysByMonth(month);
    if (days.length === 0 || ministries.length === 0) {
      setCalendarData([]);
      return;
    }

    const serviceDayIds = days.map((d) => d.id);

    // todas as escalas do mês (todos os ministérios)
    const schedulesByMinistry = await Promise.all(
      ministries.map((m) =>
        listSchedulesByMonth({
          ministryId: m.id,
          serviceDayIds,
        })
      )
    );

    const schedules = schedulesByMinistry.flat();

    // indexa por DIA + TURNO + MINISTÉRIO (pra evitar colisão)
    const scheduleIndex = new Map<
      string,
      {
        status: CalendarServiceStatus;
        scheduleId: string;
        people: {
          id: string;
          name: string;
          role: string;
          attendance?: "pending" | "confirmed" | "declined";
        }[];
      }
    >();

    schedules.forEach((s: any) => {
      const assignments = s.assignments ?? [];

      const mappedPeople = assignments
        .map((a: { personId: string; attendance?: string }) => {
          const p = peopleIndex.get(a.personId);
          if (!p) return null;

          return {
            id: p.id,
            name: p.name,
            role: "Membro",
            attendance:
              (a.attendance as "pending" | "confirmed" | "declined") ??
              "pending",
          };
        })
        .filter(
          (x: any): x is {
            id: string;
            name: string;
            role: string;
            attendance?: "pending" | "confirmed" | "declined";
          } => Boolean(x)
        );

      const key = `${s.serviceDayId}__${s.serviceLabel}__${s.ministryId}`;

      scheduleIndex.set(key, {
        status: s.status,
        scheduleId: s.id,
        people: mappedPeople,
      });
    });

    const calendar: CalendarDayData[] = await Promise.all(
      days.map(async (day) => {
        const services = await getServicesByServiceDay(day.id);

        // aqui a gente “achata” tudo em uma lista:
        // para cada turno, mostramos um item por ministério
        const servicesFlat = services.flatMap((service) =>
          ministries.map((m) => {
            const key = `${day.id}__${service.label}__${m.id}`;
            const found = scheduleIndex.get(key);

            return {
              turno: service.label,
              ministry: m.name,
              ministryId: m.id,
              scheduleId: found?.scheduleId ?? "",
              status: found?.status ?? ("empty" as CalendarServiceStatus),
              people: found?.people,
            };
          })
        );

        return {
          date: day.date,
          serviceDayId: day.id,
          services: servicesFlat,
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
      // só tenta carregar quando já tiver base
      if (ministries.length === 0 || people.length === 0) return;
      loadCalendar();
    }, [ministries, people, month])
  );

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Minha escala"
        subtitle={`${user?.name ?? ""} · Membro`}
        onLogout={logout}
      />

      {/* HEADER DO MÊS */}
      <View style={styles.monthHeader}>
        <Pressable
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <Text style={styles.nav}>◀</Text>
        </Pressable>

        <Text style={styles.monthTitle}>
          {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </Text>

        <Pressable
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
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

            <ScrollView style={{ maxHeight: 420 }}>
              {selectedDay?.services.map((s, i) => (
                <View key={`${s.turno}-${s.ministryId}-${i}`} style={styles.serviceBlock}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.turno}>
                      {s.turno} · {s.ministry}
                    </Text>

                    <Text
                      style={[
                        styles.status,
                        s.status === "published" && styles.published,
                        s.status === "draft" && styles.draft,
                      ]}
                    >
                      {statusLabel(s.status)}
                    </Text>
                  </View>

                  {s.people && s.people.length > 0 ? (
                    s.people.map((p, idx) => (
                      <Text key={`${p.id}-${idx}`} style={styles.person}>
                        • {p.name}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.empty}>Nenhuma pessoa escalada</Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <Pressable style={styles.close} onPress={() => setSelectedDay(null)}>
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
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
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
    gap: 12,
  },

  turno: { fontWeight: "800", flex: 1 },

  status: { fontWeight: "900" },
  published: { color: "#16A34A" },
  draft: { color: "#F59E0B" },

  person: {
    fontSize: 13,
    marginLeft: 8,
    color: "#374151",
    marginTop: 2,
  },

  empty: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
    fontStyle: "italic",
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
