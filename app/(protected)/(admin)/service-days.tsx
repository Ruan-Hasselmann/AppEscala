// app/(protected)/(admin)/service-days.tsx

import { AdminServiceDayModal } from "@/src/components/AdminServiceDayModal";
import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { duplicateServiceDays } from "@/src/services/duplicateServiceDays";
import {
    getServiceDaysByMonth,
    ServiceDay
} from "@/src/services/serviceDays";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Modal,
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

    const [month, setMonth] = useState(() => {
        const now = new Date();
        return new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
        );
    });
    const [serviceDays, setServiceDays] = useState<ServiceDay[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedServiceDay, setSelectedServiceDay] =
        useState<ServiceDay | null>(null);
    const [successVisible, setSuccessVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");



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

            setSuccessMessage("Dias duplicados com sucesso.");
            setSuccessVisible(true);
        } catch (err: any) {
            setSuccessMessage(`Erro - ${err.message}`);
            setSuccessVisible(true);
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
                    <View style={styles.calendar}>
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
                                        styles.dayCell,
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
            {/* SUCCESS MODAL */}
            <Modal
                visible={successVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Sucesso</Text>

                        <Text style={styles.modalMessage}>
                            {successMessage}
                        </Text>

                        <Pressable
                            style={styles.close}
                            onPress={() => setSuccessVisible(false)}
                        >
                            <Text style={styles.closeText}>OK</Text>
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

    /* =========================
       HEADER
    ========================= */

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

    /* =========================
       WEEK
    ========================= */

    weekRow: {
        flexDirection: "row",
        marginBottom: 8,
    },

    weekDay: {
        flex: 1,
        textAlign: "center",
        fontWeight: "700",
        color: "#6B7280",
    },

    /* =========================
       CALENDAR
    ========================= */

    calendar: {
        flexDirection: "row",
        flexWrap: "wrap",
    },

    empty: {
        width: "14.2857%",
        aspectRatio: 1,
    },

    dayCell: {
        width: "14.2857%",
        aspectRatio: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFF",
        marginBottom: 10,
    },

    today: {
        borderColor: "#2563EB",
        borderWidth: 2,
    },

    dayNumber: {
        fontWeight: "800",
        marginBottom: 4,
    },

    /* =========================
       DOTS (status-ready)
    ========================= */

    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#22C55E", // por enquanto todos iguais
    },

    /* =========================
       ACTIONS
    ========================= */

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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: 20,
    },

    modal: {
        backgroundColor: "#FFF",
        padding: 20,
        borderRadius: 20,
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 8,
        textTransform: "capitalize",
    },

    modalMessage: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 16,
    },

    close: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#111827",
        alignItems: "center",
    },

    closeText: {
        color: "#FFF",
        fontWeight: "800",
    },
});
