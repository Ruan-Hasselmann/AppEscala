import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import {
    listAvailabilityByPerson,
    toggleAvailability,
} from "@/src/services/availabilities";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";
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
   TYPES
========================= */

type ServiceDayWithTurnos = {
    id: string;
    date: Date;
    turnos: string[];
};

/* =========================
   SCREEN
========================= */

export default function MemberAvailability() {
    const { user, logout } = useAuth();

    const [month, setMonth] = useState(new Date());
    const [days, setDays] = useState<ServiceDayWithTurnos[]>([]);

    // Map<serviceDayId, Set<turnos>>
    const [availabilityMap, setAvailabilityMap] = useState<
        Map<string, Set<string>>
    >(new Map());

    /* =========================
       LOAD
    ========================= */

    useFocusEffect(
        useCallback(() => {
            async function load() {
                if (!user) return;

                const [serviceDays, availabilities] = await Promise.all([
                    getServiceDaysByMonth(month),
                    listAvailabilityByPerson({ personId: user.personId }),
                ]);

                // monta mapa de disponibilidade
                const map = new Map<string, Set<string>>();
                availabilities.forEach((a) => {
                    if (!map.has(a.serviceDayId)) {
                        map.set(a.serviceDayId, new Set());
                    }
                    map.get(a.serviceDayId)!.add(a.serviceLabel);
                });
                setAvailabilityMap(map);

                // busca turnos reais de cada dia
                const enriched: ServiceDayWithTurnos[] = await Promise.all(
                    serviceDays.map(async (d) => {
                        const services = await getServicesByServiceDay(d.id);

                        return {
                            id: d.id,
                            date: d.date,
                            turnos: services.map((s) => s.label),
                        };
                    })
                );

                setDays(enriched);
            }

            load();
        }, [month, user])
    );

    /* =========================
       ACTIONS
    ========================= */

    async function toggle(dayId: string, turno: string) {
        if (!user) return;

        await toggleAvailability({
            personId: user.personId,
            serviceDayId: dayId,
            serviceLabel: turno,
        });

        setAvailabilityMap((prev) => {
            const next = new Map(prev);
            const set = new Set(next.get(dayId) ?? []);
            if (set.has(turno)) set.delete(turno);
            else set.add(turno);
            next.set(dayId, set);
            return next;
        });
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title="Minha disponibilidade"
                subtitle={`${user?.name} · Membro`}
                onLogout={logout}
            />

            <ScrollView>
                <View style={styles.container}>
                    {/* HEADER MÊS */}
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

                    {days.length === 0 && (
                        <Text style={styles.empty}>
                            Nenhum dia de culto neste mês
                        </Text>
                    )}

                    {days.map((d) => {
                        const set = availabilityMap.get(d.id);
                        const hasAny = (set?.size ?? 0) > 0;

                        return (
                            <View key={d.id} style={styles.dayCard}>
                                <Text style={styles.dayText}>
                                    {d.date.toLocaleDateString("pt-BR", {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "long",
                                    })}
                                </Text>

                                <View style={styles.turnos}>
                                    {d.turnos.map((t) => {
                                        const active = set?.has(t);

                                        return (
                                            <Pressable
                                                key={t}
                                                style={[
                                                    styles.turno,
                                                    active && styles.turnoActive,
                                                ]}
                                                onPress={() => toggle(d.id, t)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.turnoText,
                                                        active && styles.turnoTextActive,
                                                    ]}
                                                >
                                                    {t}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Text
                                    style={[
                                        styles.feedback,
                                        hasAny
                                            ? styles.feedbackOk
                                            : styles.feedbackEmpty,
                                    ]}
                                >
                                    {hasAny
                                        ? "Disponibilidade definida"
                                        : "Nenhuma disponibilidade"}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
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
    nav: { fontSize: 28, fontWeight: "800" },

    empty: { fontSize: 13, color: "#6B7280" },

    dayCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },

    dayText: { fontWeight: "800", marginBottom: 8 },

    turnos: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 6,
        flexWrap: "wrap",
    },

    turno: {
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
    },

    turnoActive: {
        backgroundColor: "#DCFCE7",
    },

    turnoText: { fontWeight: "800" },
    turnoTextActive: { color: "#166534" },

    feedback: {
        fontSize: 12,
        fontWeight: "700",
    },
    feedbackOk: {
        color: "#16A34A",
    },
    feedbackEmpty: {
        color: "#9CA3AF",
    },
});
