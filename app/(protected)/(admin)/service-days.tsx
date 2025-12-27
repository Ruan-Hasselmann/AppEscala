// app/(protected)/(admin)/service-days.tsx

import { AdminServiceDayModal } from "@/src/components/AdminServiceDayModal";
import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { duplicateServiceDays } from "@/src/services/duplicateServiceDays";
import {
    createServiceDay,
    deleteServiceDay,
    getServiceDaysByMonth,
    ServiceDay,
} from "@/src/services/serviceDays";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

/* =========================
   HELPERS
========================= */

function sameDay(a: Date, b: Date) {
    return (
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
    );
}

function buildMonthMatrix(month: Date) {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const days: (Date | null)[] = [];

    // Ajuste para começar no domingo
    for (let i = 0; i < start.getDay(); i++) {
        days.push(null);
    }

    for (let d = 1; d <= end.getDate(); d++) {
        days.push(new Date(month.getFullYear(), month.getMonth(), d));
    }

    return days;
}

/* =========================
   SCREEN
========================= */

export default function AdminServiceDays() {
    const { user, logout } = useAuth();

    const [month, setMonth] = useState(new Date());
    const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedServiceDay, setSelectedServiceDay] =
        useState<ServiceDay | null>(null);


    /* =========================
       LOAD
    ========================= */

    async function load() {
        const data = await getServiceDaysByMonth(month);
        setServiceDays(data);
    }

    useFocusEffect(
        useCallback(() => {
            load();
        }, [month])
    );

    /* =========================
       DERIVED
    ========================= */

    const calendarDays = useMemo(
        () => buildMonthMatrix(month),
        [month]
    );

    function hasServiceDay(date: Date) {
        return serviceDays.some((d) => sameDay(d.date, date));
    }

    /* =========================
       ACTIONS
    ========================= */

    async function toggleDay(date: Date) {
        const existing = serviceDays.find((d) =>
            sameDay(d.date, date)
        );

        if (existing) {
            Alert.alert(
                "Remover dia de culto",
                "Deseja remover todos os cultos deste dia?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Remover",
                        style: "destructive",
                        onPress: async () => {
                            await deleteServiceDay(existing.id);
                            await load();
                        },
                    },
                ]
            );
            return;
        }

        await createServiceDay(date);
        await load();
    }

    async function onDayPress(date: Date) {
        const existing = serviceDays.find((d) =>
            sameDay(d.date, date)
        );

        setSelectedDate(date);
        setSelectedServiceDay(existing ?? null);
    }

    async function handleDuplicateMonth() {
        try {
            const sourceMonth = new Date(
                month.getFullYear(),
                month.getMonth() - 1,
                1
            );

            await duplicateServiceDays(sourceMonth, month);
            await load();

            Alert.alert("Sucesso", "Dias duplicados com sucesso.");
        } catch (err: any) {
            Alert.alert("Erro", err.message);
        }
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title="Dias de culto"
                subtitle={`${user?.name} · Administrador`}
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

                    {/* DIAS DA SEMANA */}
                    <View style={styles.weekRow}>
                        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                            (d) => (
                                <Text key={d} style={styles.weekDay}>
                                    {d}
                                </Text>
                            )
                        )}
                    </View>

                    {/* CALENDÁRIO */}
                    <View style={styles.grid}>
                        {calendarDays.map((date, idx) => {
                            if (!date) {
                                return <View key={idx} style={styles.empty} />;
                            }

                            const active = hasServiceDay(date);
                            const today = sameDay(date, new Date());

                            return (
                                <Pressable
                                    key={date.toISOString()}
                                    style={[
                                        styles.day,
                                        today && styles.today,
                                    ]}
                                    onPress={() => onDayPress(date)} // ✅ AQUI
                                >
                                    <Text style={styles.dayNumber}>
                                        {date.getDate()}
                                    </Text>

                                    {active && <View style={styles.dot} />}
                                </Pressable>
                            );
                        })}
                    </View>

                    <Pressable
                        style={styles.duplicateBtn}
                        onPress={handleDuplicateMonth}
                    >
                        <Text style={styles.duplicateText}>
                            Duplicar mês anterior
                        </Text>
                    </Pressable>
                </View>

            </ScrollView>
            <AdminServiceDayModal
                visible={!!selectedDate}
                date={selectedDate}
                serviceDay={selectedServiceDay}
                onClose={() => {
                    setSelectedDate(null);
                    setSelectedServiceDay(null);
                }}
                onSaved={load}
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
    nav: { fontSize: 28, fontWeight: "800" },

    weekRow: {
        flexDirection: "row",
        marginBottom: 8,
    },
    weekDay: {
        width: "14.285%",
        textAlign: "center",
        fontWeight: "700",
        color: "#6B7280",
    },

    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },

    empty: {
        width: "14.285%",
        aspectRatio: 1,
    },

    day: {
        width: "14.285%",
        aspectRatio: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginBottom: 8,
    },

    today: {
        borderColor: "#2563EB",
        borderWidth: 2,
    },

    dayNumber: {
        fontWeight: "700",
        marginBottom: 4,
    },

    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#2563EB",
    },

    duplicateBtn: {
        marginTop: 16,
        padding: 14,
        borderRadius: 14,
        backgroundColor: "#111827",
        alignItems: "center",
    },
    duplicateText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
});
