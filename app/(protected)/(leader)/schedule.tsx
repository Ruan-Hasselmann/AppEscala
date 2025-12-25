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
   SCREEN
========================= */

async function mapToCalendarData(params: {
    serviceDays: ServiceDay[];
    ministryId: string;
}): Promise<CalendarDayData[]> {
    const { serviceDays, ministryId } = params;

    if (serviceDays.length === 0) return [];

    const serviceDayIds = serviceDays.map(d => d.id);

    // 1️⃣ Busca TODAS as escalas do mês de uma vez
    const schedules = await listSchedulesByMonth({
        ministryId,
        serviceDayIds,
    });

    // 2️⃣ Indexa schedules por dia + serviço
    const scheduleIndex = new Map<string, CalendarServiceStatus>();

    for (const s of schedules) {
        const key = `${s.serviceDayId}__${s.serviceLabel}`;
        scheduleIndex.set(key, s.status);
    }

    // 3️⃣ Busca TODOS os serviços em paralelo
    const servicesByDay = await Promise.all(
        serviceDays.map(async (day) => ({
            serviceDayId: day.id,
            services: await getServicesByServiceDay(day.id),
        }))
    );

    const servicesIndex = new Map<
        string,
        { label: string }[]
    >();

    servicesByDay.forEach(({ serviceDayId, services }) => {
        servicesIndex.set(serviceDayId, services);
    });

    // 4️⃣ Monta o calendário FINAL (sem awaits)
    return serviceDays.map((day) => {
        const services = servicesIndex.get(day.id) ?? [];

        return {
            serviceDayId: day.id,
            date: day.date,
            services: services.map((service) => {
                const key = `${day.id}__${service.label}`;

                return {
                    label: service.label,
                    status:
                        scheduleIndex.get(key) ??
                        ("empty" as CalendarServiceStatus),
                };
            }),
        };
    });
}

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
    const [selectedService, setSelectedService] =
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

        const me = p.find((x) => x.id === user.personId) ?? null;
        setPerson(me);
        setMinistries(m.filter((x) => x.active));
    }

    /* =========================
       LEADER MINISTRIES
    ========================= */

    const leaderMinistries = useMemo(() => {
        if (!person) return [];

        return person.ministries
            .filter((m) => m.role === "leader")
            .map((m) => ministries.find((x) => x.id === m.ministryId))
            .filter(Boolean)
            .sort((a, b) =>
                a!.name.localeCompare(b!.name, "pt-BR", {
                    sensitivity: "base",
                })
            ) as Ministry[];
    }, [person, ministries]);

    async function loadCalendar() {
        if (!selectedMinistryId) {
            setLoadingCalendar(false); // 🔴 ESSENCIAL
            return;
        }

        setLoadingCalendar(true);

        try {
            const days = await getServiceDaysByMonth(month);

            if (days.length === 0) {
                setCalendarData([]);
                return;
            }

            const calendar = await mapToCalendarData({
                serviceDays: days,
                ministryId: selectedMinistryId,
            });

            setCalendarData(calendar);
        } catch (e) {
            console.error("Erro ao carregar calendário", e);
        } finally {
            setLoadingCalendar(false);
        }
    }

    /* =========================
       DEFAULT MINISTRY
    ========================= */

    // 1️⃣ Carrega pessoa + ministérios
    useEffect(() => {
        loadBase();
    }, []);

    // 2️⃣ Define ministério padrão
    useEffect(() => {
        if (
            leaderMinistries.length > 0 &&
            !selectedMinistryId
        ) {
            setSelectedMinistryId(leaderMinistries[0].id);
        }
    }, [leaderMinistries]);

    // 3️⃣ Carrega calendário
    useFocusEffect(
        useCallback(() => {
            if (!selectedMinistryId) return;

            loadCalendar();
        }, [selectedMinistryId, month])
    );


    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title="Gerenciar Escalas"
                subtitle={`${user?.name} · Líder`}
                onLogout={logout}
            />

            {/* SELECT DE MINISTÉRIO */}
            {leaderMinistries.length > 1 && (
                <View style={styles.dropdownWrapper}>
                    <Pressable
                        style={styles.dropdown}
                        onPress={() => setDropdownOpen((v) => !v)}
                    >
                        <Text style={styles.dropdownText}>Gerar escala para o ministerio:</Text>
                        <Text style={styles.dropdownText}>
                            {
                                leaderMinistries.find(
                                    (m) => m.id === selectedMinistryId
                                )?.name
                            }
                        </Text>
                        <Text style={styles.chevron}>▾</Text>
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
                                    <Text style={styles.dropdownItem}>
                                        {m.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            )}

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
                    {loadingCalendar ? (
                        <View style={{ paddingVertical: 40 }}>
                            <Text
                                style={{
                                    textAlign: "center",
                                    color: "#6B7280",
                                    fontWeight: "700",
                                }}
                            >
                                Carregando calendário...
                            </Text>
                        </View>
                    ) : (
                        <CalendarDashboard
                            month={month}
                            data={calendarData}
                            onDayPress={(day) => {
                                if (!day.services || day.services.length === 0) {
                                    return;
                                }
                                setSelectedDay(day);
                            }}
                        />
                    )}

                    {/* AÇÃO GLOBAL */}
                    <Pressable style={styles.generateBtn}>
                        <Text style={styles.generateText}>
                            Gerar escalas do mês
                        </Text>
                    </Pressable>
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
                            Selecione o culto
                        </Text>

                        {selectedDay?.services.map((service) => (
                            <Pressable
                                key={service.label}
                                style={[
                                    styles.serviceOption,
                                    selectedService === service.label &&
                                    styles.serviceSelected,
                                ]}
                                onPress={() => setSelectedService(service.label)}
                            >
                                <Text
                                    style={[
                                        styles.serviceText,
                                        selectedService === service.label &&
                                        styles.serviceTextSelected,
                                    ]}
                                >
                                    {service.label}
                                </Text>
                            </Pressable>
                        ))}

                        <Pressable
                            style={[
                                styles.generateBtn,
                                !selectedService && { opacity: 0.5 },
                            ]}
                            disabled={!selectedService}
                            onPress={() => {
                                if (!selectedDay || !selectedService) return;

                                router.push({
                                    pathname: "/(protected)/(leader)/schedule/generate",
                                    params: {
                                        name: person?.name,
                                        ministryId: selectedMinistryId,
                                        date: selectedDay?.date.toLocaleDateString("pt-BR", {
                                            weekday: "long",
                                            day: "2-digit",
                                            month: "long",
                                        }),
                                        serviceLabel: selectedService,
                                        serviceDayId: selectedDay.serviceDayId,
                                    },
                                });

                                setSelectedDay(null);
                                setSelectedService(null);
                            }}
                        >
                            <Text style={styles.generateText}>
                                Gerar escala
                            </Text>
                        </Pressable>

                        <Pressable
                            style={styles.close}
                            onPress={() => {
                                setSelectedDay(null);
                                setSelectedService(null);
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

    /* DROPDOWN */
    dropdownWrapper: {
        paddingHorizontal: 16,
        marginBottom: 8,
        zIndex: 20,
    },

    dropdown: {

        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },

    dropdownText: {
        fontWeight: "800",
        color: "#111827",
    },

    chevron: {
        fontSize: 18,
        fontWeight: "800",
        color: "#6B7280",
    },

    dropdownMenu: {
        marginTop: 6,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        overflow: "hidden",
    },

    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontWeight: "700",
        color: "#111827",
    },

    /* MONTH */
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

    generateBtn: {
        marginTop: 20,
        marginBottom: 5,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#111827",
        alignItems: "center",
    },

    generateText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },

    /* MODAL */
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
    },

    modal: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 20,
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 8,
    },

    modalDesc: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 16,
    },

    close: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#2563EB",
        alignItems: "center",
    },

    closeText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
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

    serviceText: {
        fontWeight: "700",
        color: "#374151",
    },

    serviceTextSelected: {
        color: "#2563EB",
    },

});
