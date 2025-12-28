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

/* =========================
   HELPERS
========================= */

function getServiceDayTime(s: any): number {
    // 1️⃣ Firestore Timestamp
    if (s.serviceDayDate?.toDate) {
        const d = s.serviceDayDate.toDate();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }

    // 2️⃣ ISO string
    if (typeof s.serviceDayDate === "string") {
        const t = Date.parse(s.serviceDayDate);
        if (!Number.isNaN(t)) return t;
    }

    // 3️⃣ fallback legado
    if (typeof s.serviceDate === "string") {
        const m = s.serviceDate.match(/\b(\d{1,2})\s+de\b/i);
        if (m?.[1]) {
            const day = Number(m[1]);
            if (Number.isFinite(day)) {
                return day * 24 * 60 * 60 * 1000;
            }
        }
    }

    return 0;
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
            async function load() {
                if (!user) return;

                setLoading(true);

                const data = await listPublishedSchedulesByPerson({
                    personId: user.personId,
                });

                setSchedules(data);
                setLoading(false);
            }

            load();
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
       IDENTIFICA PRÓXIMO CULTO
    ========================= */

    const nextServiceDayTime = useMemo(() => {
        const future = schedules
            .map((s) => getServiceDayTime(s))
            .filter((t) => t >= today)
            .sort((a, b) => a - b);

        return future.length > 0 ? future[0] : null;
    }, [schedules, today]);

    function isNextService(s: any) {
        return getServiceDayTime(s) === nextServiceDayTime;
    }

    /* =========================
       ORDENAÇÃO FINAL (🔥 AQUI)
    ========================= */

    const sortedSchedules = useMemo(() => {
        return [...schedules].sort((a, b) => {
            const aIsNext = isNextService(a);
            const bIsNext = isNextService(b);

            // 🔥 1) Próximo culto SEMPRE no topo
            if (aIsNext && !bIsNext) return -1;
            if (!aIsNext && bIsNext) return 1;

            // 📅 2) Depois ordena por dia
            const timeA = getServiceDayTime(a);
            const timeB = getServiceDayTime(b);
            if (timeA !== timeB) return timeA - timeB;

            // ⏰ 3) Depois por turno
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
                                ]}
                            >
                                {/* HEADER */}
                                <View style={styles.cardHeader}>
                                    <Text style={styles.title}>
                                        {s.serviceLabel}
                                    </Text>

                                    {next && (
                                        <View style={styles.nextBadge}>
                                            <Text style={styles.nextBadgeText}>
                                                PRÓXIMO
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.date}>
                                    {s.serviceDate}
                                </Text>

                                {/* AÇÕES */}
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
                                            style={styles.decline}
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

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    title: { fontWeight: "800" },

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
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: "center",
    },

    confirmText: { color: "#FFF", fontWeight: "800" },

    decline: { paddingVertical: 10, alignItems: "center" },
    declineText: { color: "#DC2626", fontWeight: "800" },

    locked: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },

    confirmed: { color: "#16A34A", fontWeight: "800" },
    declined: { color: "#DC2626", fontWeight: "800" },
});
