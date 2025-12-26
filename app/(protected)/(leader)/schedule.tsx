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
import { getServiceDaysByMonth, ServiceDay } from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";

import { router, useFocusEffect } from "expo-router";
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

async function mapToCalendarData(params: {
  serviceDays: ServiceDay[];
  ministryId: string;
}): Promise<CalendarDayData[]> {
  const { serviceDays, ministryId } = params;

  if (serviceDays.length === 0) return [];

  const serviceDayIds = serviceDays.map((d) => d.id);

  // 🔥 agora traz TODAS as escalas (por turno)
  const schedules = await listSchedulesByMonth({
    ministryId,
    serviceDayIds,
  });

  // 🔥 indexa por DIA + TURNO
  const scheduleIndex = new Map<
    string,
    CalendarServiceStatus
  >();

  schedules.forEach((s) => {
    const key = `${s.serviceDayId}__${s.serviceLabel}`;
    scheduleIndex.set(key, s.status);
  });

  // 🔥 busca turnos (manhã / noite / etc)
  const servicesByDay = await Promise.all(
    serviceDays.map(async (day) => ({
      day,
      services: await getServicesByServiceDay(day.id),
    }))
  );

  return servicesByDay.map(({ day, services }) => ({
    serviceDayId: day.id,
    date: day.date,
    services: services.map((service) => {
      const key = `${day.id}__${service.label}`;

      return {
        turno: service.label,
        ministry: "", // não usado nesta tela
        status:
          scheduleIndex.get(key) ??
          ("empty" as CalendarServiceStatus),
      };
    }),
  }));
}

/* =========================
   SCREEN
========================= */

export default function LeaderSchedule() {
    const { user, logout } = useAuth();

    const [month, setMonth] = useState(() => {
        const now = new Date();
        return new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );
    });

    const [calendarData, setCalendarData] =
        useState<CalendarDayData[]>([]);
    const [selectedDay, setSelectedDay] =
        useState<CalendarDayData | null>(null);
    const [selectedTurno, setSelectedTurno] =
        useState<string | null>(null);

    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [person, setPerson] = useState<Person | null>(null);

    const [selectedMinistryId, setSelectedMinistryId] =
        useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [loadingCalendar, setLoadingCalendar] = useState(true);

    /* =========================
       LOAD BASE
    ========================= */

    async function loadBase() {
        if (!user) return;

        const [p, m] = await Promise.all([
            listPeople(),
            listMinistries(),
        ]);

        setPerson(p.find((x) => x.id === user.personId) ?? null);
        setMinistries(m.filter((x) => x.active));
    }

    const leaderMinistries = useMemo(() => {
        if (!person) return [];

        return person.ministries
            .filter((m) => m.role === "leader")
            .map((m) => ministries.find((x) => x.id === m.ministryId))
            .filter(Boolean) as Ministry[];
    }, [person, ministries]);

    async function loadCalendar() {
        const ministry = leaderMinistries.find(
            (m) => m.id === selectedMinistryId
        );

        if (!ministry) {
            setLoadingCalendar(false);
            return;
        }

        setLoadingCalendar(true);

        const days = await getServiceDaysByMonth(month);

        const calendar = await mapToCalendarData({
            serviceDays: days,
            ministryId: selectedMinistryId!,
        });

        setCalendarData(calendar);
        setLoadingCalendar(false);
    }

    useEffect(() => {
        loadBase();
    }, []);

    useEffect(() => {
        if (leaderMinistries.length > 0 && !selectedMinistryId) {
            setSelectedMinistryId(leaderMinistries[0].id);
        }
    }, [leaderMinistries]);

    useFocusEffect(
        useCallback(() => {
            loadCalendar();
        }, [selectedMinistryId, month])
    );

    const selectedMinistry = leaderMinistries.find(
        (m) => m.id === selectedMinistryId
    );

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title={`Gerenciar Escala · ${selectedMinistry?.name ?? ""}`}
                subtitle={`${user?.name} · Líder`}
                onLogout={logout}
            />

            {/* SELECT DE MINISTÉRIO */}
            {leaderMinistries.length > 1 && (
                <View style={styles.dropdownWrapper}>
                    <Text style={styles.title}>Selecione o ministerio</Text>
                    <Pressable
                        style={styles.dropdown}
                        onPress={() => setDropdownOpen((v) => !v)}
                    >
                        <Text style={styles.dropdownText}>
                            {selectedMinistry?.name}
                        </Text>
                        <Text style={styles.chevron}> ▾</Text>
                    </Pressable>

                    {dropdownOpen && (
                        <View style={styles.dropdownMenu}>
                            {leaderMinistries.map((m) => (
                                <Pressable
                                    key={m.id}
                                    onPress={() => {
                                        setSelectedMinistryId(m.id);
                                        setDropdownOpen(false);
                                    }}
                                >
                                    <Text style={styles.dropdownItem}>{m.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            )}
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
                    {loadingCalendar ? (
                        <Text style={styles.loading}>
                            Carregando calendário...
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
            <Modal visible={!!selectedDay} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>
                            {selectedDay?.date.toLocaleDateString("pt-BR", {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                            })}
                        </Text>

                        <Text style={styles.modalSubtitle}>
                            Selecione o turno
                        </Text>

                        {selectedDay?.services.map((service) => (
                            <Pressable
                                key={service.turno}
                                style={[
                                    styles.serviceOption,
                                    selectedTurno === service.turno &&
                                    styles.serviceSelected,
                                ]}
                                onPress={() => setSelectedTurno(service.turno)}
                            >
                                <Text
                                    style={[
                                        styles.serviceText,
                                        selectedTurno === service.turno &&
                                        styles.serviceTextSelected,
                                    ]}
                                >
                                    {service.turno}
                                </Text>
                            </Pressable>
                        ))}

                        <Pressable
                            style={[
                                styles.generateBtn,
                                !selectedTurno && { opacity: 0.5 },
                            ]}
                            disabled={!selectedTurno}
                            onPress={() => {
                                if (!selectedDay || !selectedTurno) return;

                                router.push({
                                    pathname:
                                        "/(protected)/(leader)/schedule/generate",
                                    params: {
                                        name: person?.name,
                                        ministryId: selectedMinistryId,
                                        date: selectedDay.date.toLocaleDateString(
                                            "pt-BR",
                                            {
                                                weekday: "long",
                                                day: "2-digit",
                                                month: "long",
                                            }
                                        ),
                                        serviceLabel: selectedTurno,
                                        serviceDayId: selectedDay.serviceDayId,
                                    },
                                });

                                setSelectedDay(null);
                                setSelectedTurno(null);
                            }}
                        >
                            <Text style={styles.generateText}>
                                Gerenciar escala
                            </Text>
                        </Pressable>

                        <Pressable
                            style={styles.close}
                            onPress={() => {
                                setSelectedDay(null);
                                setSelectedTurno(null);
                            }}
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
    title: {
        fontSize: 18,
        fontWeight: "800",
        padding: 10,
    },
    nav: { fontSize: 28, fontWeight: "800" },

    dropdownWrapper: { paddingHorizontal: 16, marginBottom: 8},
    dropdown: {
        flexDirection: "row",
        justifyContent: "center",
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#000",
    },
    dropdownText: { fontWeight: "900" },
    chevron: { fontWeight: "900", fontSize: 15 },

    dropdownMenu: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        marginTop: 6,
    },
    dropdownItem: { padding: 12, fontWeight: "700" },

    loading: {
        textAlign: "center",
        color: "#6B7280",
        fontWeight: "700",
        marginTop: 40,
    },

    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
    },
    modal: {
        backgroundColor: "#FFF",
        margin: 20,
        padding: 20,
        borderRadius: 20,
    },
    modalTitle: { fontWeight: "800", marginBottom: 12 },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 8,
    },

    serviceOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 8,
        alignItems: "center",
    },
    serviceSelected: {
        backgroundColor: "#DBEAFE",
        borderColor: "#2563EB",
    },
    serviceText: { fontWeight: "700" },
    serviceTextSelected: { color: "#2563EB" },

    generateBtn: {
        marginTop: 12,
        marginBottom: 12,
        padding: 14,
        backgroundColor: "#111827",
        borderRadius: 14,
        alignItems: "center",
    },
    generateText: { color: "#FFF", fontWeight: "800" },

    close: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#2563EB",
        alignItems: "center",
    },
    closeText: { color: "#FFFFFF", fontWeight: "800" },
});
