import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import {
    listPublishedSchedulesByPerson,
    updateAttendance,
} from "@/src/services/schedules";

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
   CONSTANTS
========================= */

const TURN_ORDER: Record<string, number> = {
    manhã: 1,
    manha: 1,
    tarde: 2,
    noite: 3,
};

const MONTHS: Record<string, number> = {
    janeiro: 0,
    fevereiro: 1,
    março: 2,
    marco: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11,
};

/* =========================
   HELPERS
========================= */

function getServiceDayTime(s: any): number {
    if (!s.serviceDate || typeof s.serviceDate !== "string") {
        return 0;
    }

    // ex: "sábado, 10 de janeiro"
    const match = s.serviceDate
        .toLowerCase()
        .match(/(\d{1,2})\s+de\s+([a-zç]+)/i);

    if (!match) return 0;

    const day = Number(match[1]);
    const monthName = match[2];
    const month = MONTHS[monthName];

    if (!Number.isFinite(day) || month === undefined) {
        return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let date = new Date(today.getFullYear(), month, day);
    date.setHours(0, 0, 0, 0);

    // se já passou neste ano → próximo ano
    if (date.getTime() < today.getTime()) {
        date = new Date(today.getFullYear() + 1, month, day);
        date.setHours(0, 0, 0, 0);
    }

    return date.getTime();
}

/* =========================
   SCREEN
========================= */

export default function MemberSchedule() {
    const { user, logout } = useAuth();

    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    /* =========================
       LOAD
    ========================= */

    useFocusEffect(
        useCallback(() => {
            let active = true;

            async function load() {
                if (!user) return;

                setLoading(true);

                const data = await listPublishedSchedulesByPerson({
                    personId: user.personId,
                });

                if (active) {
                    setSchedules(data);
                    setLoading(false);
                }
            }

            load();

            return () => {
                active = false;
            };
        }, [user])
    );

    /* =========================
       BASE DATE (HOJE)
    ========================= */

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }, []);

    /* =========================
       PRÓXIMO DIA DE CULTO
    ========================= */

    const nextServiceDayTime = useMemo(() => {
        const future = schedules
            .map((s) => getServiceDayTime(s))
            .filter((time) => time >= today)
            .sort((a, b) => a - b);

        return future.length > 0 ? future[0] : null;
    }, [schedules, today]);

    /* =========================
       ESTE É O AJUSTE CRÍTICO
    ========================= */

    function isNextService(s: any) {
        if (!nextServiceDayTime) return false;
        return getServiceDayTime(s) === nextServiceDayTime;
    }

    /* =========================
       ORDENAÇÃO FINAL
    ========================= */

    const sortedSchedules = useMemo(() => {
        return [...schedules].sort((a, b) => {
            const aIsNext = isNextService(a);
            const bIsNext = isNextService(b);

            // 1️⃣ todos do próximo dia sobem
            if (aIsNext && !bIsNext) return -1;
            if (!aIsNext && bIsNext) return 1;

            // 2️⃣ ordena por data
            const timeA = getServiceDayTime(a);
            const timeB = getServiceDayTime(b);
            if (timeA !== timeB) return timeA - timeB;

            // 3️⃣ ordena por turno
            const orderA = TURN_ORDER[a.serviceLabel?.toLowerCase()] ?? 99;
            const orderB = TURN_ORDER[b.serviceLabel?.toLowerCase()] ?? 99;
            return orderA - orderB;
        });
    }, [schedules, nextServiceDayTime]);

    /* =========================
       ACTIONS
    ========================= */

    async function confirm(scheduleId: string) {
        if (!user) return;

        await updateAttendance({
            scheduleId,
            personId: user.personId,
            attendance: "confirmed",
        });

        setSchedules((prev) =>
            prev.map((s) =>
                s.id === scheduleId
                    ? { ...s, attendance: "confirmed" }
                    : s
            )
        );
    }

    async function decline(scheduleId: string) {
        if (!user) return;

        await updateAttendance({
            scheduleId,
            personId: user.personId,
            attendance: "declined",
        });

        setSchedules((prev) =>
            prev.map((s) =>
                s.id === scheduleId
                    ? { ...s, attendance: "declined" }
                    : s
            )
        );
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title="Minhas escalas"
                subtitle={`${user?.name} · Membro`}
                onLogout={logout}
            />

            <ScrollView>
                <View style={styles.container}>
                    {loading && (
                        <Text style={styles.empty}>Carregando...</Text>
                    )}

                    {!loading && sortedSchedules.length === 0 && (
                        <Text style={styles.empty}>
                            Nenhuma escala publicada
                        </Text>
                    )}

                    {sortedSchedules.map((s) => {
                        const next = isNextService(s);

                        return (
                            <View
                                key={s.id}
                                style={[
                                    styles.card,
                                    next && styles.cardNext,
                                    !next && styles.cardDisabled,
                                ]}
                            >
                                <View style={styles.cardHeader}>
                                    <Text
                                        style={[
                                            styles.title,
                                            next && styles.titleNext,
                                        ]}
                                    >
                                        {s.serviceLabel}
                                    </Text>

                                    {next && (
                                        <View style={styles.nextBadge}>
                                            <Text style={styles.nextBadgeText}>
                                                PRÓXIMO CULTO
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.date}>
                                    {s.serviceDate}
                                </Text>

                                {s.attendance === "pending" && next && (
                                    <View style={styles.actions}>
                                        <Pressable
                                            style={styles.confirm}
                                            onPress={() => confirm(s.id)}
                                        >
                                            <Text style={styles.confirmText}>
                                                Confirmar presença
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => decline(s.id)}
                                        >
                                            <Text style={styles.declineText}>
                                                Não poderei servir
                                            </Text>
                                        </Pressable>
                                    </View>
                                )}

                                {s.attendance === "pending" && !next && (
                                    <Text style={styles.locked}>
                                        Disponível para confirmação apenas no próximo culto
                                    </Text>
                                )}

                                {s.attendance === "confirmed" && (
                                    <Text style={styles.confirmed}>
                                        ✅ Presença confirmada
                                    </Text>
                                )}

                                {s.attendance === "declined" && (
                                    <Text style={styles.declined}>
                                        ❌ Não poderá comparecer
                                    </Text>
                                )}
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

    empty: { fontSize: 13, color: "#6B7280" },

    card: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
    },

    cardNext: {
        borderWidth: 2,
        borderColor: "#22C55E",
        backgroundColor: "#F0FDF4",
    },

    cardDisabled: {
        opacity: 0.55,
    },

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    title: { fontWeight: "800" },

    titleNext: {
        fontSize: 18,
        fontWeight: "900",
    },

    date: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 8,
    },

    nextBadge: {
        backgroundColor: "#22C55E",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },

    nextBadgeText: {
        color: "#FFF",
        fontWeight: "900",
        fontSize: 11,
    },

    actions: { gap: 8 },

    confirm: {
        backgroundColor: "#16A34A",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
    },

    confirmText: {
        color: "#FFF",
        fontWeight: "900",
        fontSize: 16,
    },

    declineText: {
        color: "#DC2626",
        fontWeight: "800",
        textAlign: "center",
        paddingVertical: 8,
    },

    locked: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },

    confirmed: { color: "#16A34A", fontWeight: "800" },
    declined: { color: "#DC2626", fontWeight: "800" },
});
