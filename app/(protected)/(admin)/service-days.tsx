import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import {
    CalendarDashboard,
    CalendarDayData,
} from "@/src/components/CalendarDashboard";
import { useAuth } from "@/src/contexts/AuthContext";
import {
    createServiceDay,
    deleteServiceDay,
    getServiceDaysByMonth,
    ServiceDay,
} from "@/src/services/serviceDays";
import {
    createService,
    deleteService,
    getServicesByServiceDay,
    Service,
} from "@/src/services/services";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

/* =========================
   TYPES
========================= */

type DraftService = {
    label: string;
    shift?: "manha" | "tarde" | "noite" | "custom";
};

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

    const [selectedServiceDay, setSelectedServiceDay] =
        useState<ServiceDay | null>(null);
    const [pendingDate, setPendingDate] = useState<Date | null>(null);

    const [services, setServices] = useState<Service[]>([]);
    const [newServiceLabel, setNewServiceLabel] = useState("");
    const [servicesCount, setServicesCount] = useState<number | null>(null);
    const [draftServices, setDraftServices] = useState<DraftService[]>([]);
    const [confirmDay, setConfirmDay] = useState<ServiceDay | null>(null);
    const [confirmServices, setConfirmServices] = useState<Service[]>([]);

    /* =========================
       LOADERS
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
       MODAL HELPERS
    ========================= */

    function closeModal() {
        setSelectedServiceDay(null);
        setPendingDate(null);
        setServices([]);
        setServicesCount(null);
        setNewServiceLabel("");
        setDraftServices([]);
    }

    async function loadServicesForDay(serviceDayId: string) {
        const list = await getServicesByServiceDay(serviceDayId);
        setServices(list);
        setServicesCount(list.length > 0 ? list.length : 1);
    }

    /* =========================
       SAVE LOGIC
    ========================= */

    async function saveServices() {
        // 1) garante que existe um serviceDay (se for pendente, cria agora)
        let day = selectedServiceDay;

        if (!day && pendingDate) {
            await createServiceDay(pendingDate);

            const refreshed = await getServiceDaysByMonth(month);
            setServiceDays(refreshed);

            day =
                refreshed.find((d) => sameDay(d.date, pendingDate)) ??
                null;

            if (!day) return;

            setSelectedServiceDay(day);
            setPendingDate(null);
        }

        if (!day) return;

        // 2) remove services existentes (fonte da verdade = Firestore)
        const existingServices = await getServicesByServiceDay(day.id);
        for (const s of existingServices) {
            await deleteService(s.id);
        }

        // 3) cria services conforme quantidade
        if (servicesCount === 1) {
            await createService({
                serviceDayId: day.id,
                label: "Culto",
                order: 1,
                type: "single",
            });
        } else {
            const labels = ["Manhã", "Tarde", "Noite"] as const;
            const shifts = ["manha", "tarde", "noite"] as const;

            for (let i = 0; i < draftServices.length; i++) {
                const s = draftServices[i];

                await createService({
                    serviceDayId: day.id,
                    label: s.label,
                    order: i + 1,
                    type: draftServices.length === 1 ? "single" : "multiple",
                    shift: s.shift ?? "custom",
                });
            }
        }

        // 4) recarrega a lista do modal SEM depender de selectedServiceDay (evita bug da 1ª vez)
        await loadServicesForDay(day.id);

        // 5) recarrega dias do mês (para refletir no calendário)
        await load();

        // 6) fecha modal
        closeModal();
    }

    function addDraftService() {
        const label = newServiceLabel.trim();
        if (!label) return;

        setDraftServices((prev) => [
            ...prev,
            { label, shift: "custom" },
        ]);

        setNewServiceLabel("");
    }

    async function removeService(serviceId: string) {
        if (!selectedServiceDay) return;
        await deleteService(serviceId);
        await loadServicesForDay(selectedServiceDay.id);
    }

    /* =========================
       CALENDAR
    ========================= */

    function mapServiceDaysToCalendar(
        days: ServiceDay[]
    ): CalendarDayData[] {
        return days.map((d) => ({
            date: d.date,
            services: [
                {
                    label: "Culto",
                    status: "pending",
                },
            ],
        }));
    }

    async function onDayPress(date: Date) {
        const existing = serviceDays.find((d) => sameDay(d.date, date));

        // se já existe: mantém seu comportamento atual (remove ao clicar)
        if (existing) {
            const services = await getServicesByServiceDay(existing.id);
            setConfirmDay(existing);
            setConfirmServices(services);
            return;
        }

        // se não existe: apenas abre modal pendente (não salva nada)
        setPendingDate(date);
        setSelectedServiceDay(null);
        setServices([]);
        setServicesCount(null);
        setNewServiceLabel("");
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

            <View style={styles.container}>
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

                <CalendarDashboard
                    month={month}
                    data={mapServiceDaysToCalendar(serviceDays)}
                    onDayPress={(day) => onDayPress(day.date)}
                />
            </View>

            <Modal
                visible={!!selectedServiceDay || !!pendingDate}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
                    >
                        <View style={styles.modal}>
                            <Text style={styles.modalTitle}>
                                Cultos —{" "}
                                {(selectedServiceDay?.date ?? pendingDate)?.toLocaleDateString(
                                    "pt-BR",
                                    {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "2-digit",
                                    }
                                )}
                            </Text>

                            <Text style={styles.sectionTitle}>
                                Selecione a quantidade de cultos.
                            </Text>

                            <View style={styles.countRow}>
                                {[1, 2, 3].map((n) => (
                                    <Pressable
                                        key={n}
                                        style={[
                                            styles.countBtn,
                                            servicesCount === n && styles.countBtnActive,
                                        ]}
                                        onPress={() => {
                                            setServicesCount(n);

                                            if (n === 1) {
                                                setDraftServices([
                                                    { label: "Culto", shift: "custom" },
                                                ]);
                                            } else {
                                                const labels = ["Manhã", "Noite", "Tarde"] as const;
                                                const shifts = ["manha", "noite", "tarde"] as const;

                                                setDraftServices(
                                                    Array.from({ length: n }).map((_, i) => ({
                                                        label: labels[i] ?? `Culto ${i + 1}`,
                                                        shift: shifts[i] ?? "custom",
                                                    }))
                                                );
                                            }
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.countText,
                                                servicesCount === n && styles.countTextActive,
                                            ]}
                                        >
                                            {n}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* LISTA (modo rascunho) */}
                            {pendingDate ? (
                                draftServices.length === 0 ? (
                                    <Text style={styles.noPeople}>
                                        Nenhum culto configurado
                                    </Text>
                                ) : (
                                    draftServices.map((s, index) => (
                                        <View key={index} style={styles.serviceRow}>
                                            <Text style={styles.serviceTitle}>
                                                {index + 1}. {s.label}
                                            </Text>

                                            <Pressable
                                                style={styles.deleteBtn}
                                                onPress={() =>
                                                    setDraftServices((prev) =>
                                                        prev.filter((_, i) => i !== index)
                                                    )
                                                }
                                            >
                                                <Text style={styles.deleteText}>Remover</Text>
                                            </Pressable>
                                        </View>
                                    ))
                                )
                            ) : (
                                <Text style={styles.noPeople}>
                                    Este dia já está salvo. Para alterar, remova e crie novamente.
                                </Text>
                            )}

                            {/* ADICIONAR (só habilita após salvar/criar day) */}
                            <View style={styles.addRow}>
                                <TextInput
                                    value={newServiceLabel}
                                    onChangeText={setNewServiceLabel}
                                    autoCapitalize="words"
                                    placeholder="Ex: Manhã, Noite, 18h"
                                    style={styles.input}
                                />
                                <Pressable
                                    style={[
                                        styles.addBtn,
                                        !pendingDate && { opacity: 0.5 },
                                    ]}
                                    onPress={addDraftService}
                                    disabled={!pendingDate}
                                >
                                    <Text style={styles.addText}>Adicionar</Text>
                                </Pressable>
                            </View>

                            <View style={styles.footer}>
                                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.saveBtn,
                                        servicesCount === null && { opacity: 0.5 },
                                    ]}
                                    disabled={servicesCount === null}
                                    onPress={saveServices}
                                >
                                    <Text style={styles.saveText}>Salvar</Text>
                                </Pressable>

                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            <Modal
                visible={!!confirmDay}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmDay(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>
                            Remover cultos do dia
                        </Text>

                        <Text style={styles.sectionTitle}>
                            {confirmDay?.date.toLocaleDateString("pt-BR", {
                                weekday: "long",
                                day: "2-digit",
                                month: "2-digit",
                            })}
                        </Text>

                        {confirmServices.length === 0 ? (
                            <Text style={styles.noPeople}>
                                Nenhum culto cadastrado
                            </Text>
                        ) : (
                            confirmServices.map((s) => (
                                <Text key={s.id} style={styles.serviceTitle}>
                                    • {s.label}
                                </Text>
                            ))
                        )}

                        <Text style={{ marginTop: 12, color: "#991B1B" }}>
                            Essa ação removerá todos os cultos deste dia.
                        </Text>

                        <View style={styles.footer}>
                            <Pressable
                                style={styles.cancelBtn}
                                onPress={() => setConfirmDay(null)}
                            >
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                style={styles.deleteBtnRemove}
                                onPress={async () => {
                                    if (!confirmDay) return;
                                    await deleteServiceDay(confirmDay.id);
                                    setConfirmDay(null);
                                    await load();
                                }}
                            >
                                <Text style={styles.deleteTextRemove}>Remover</Text>
                            </Pressable>
                        </View>
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
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: "800",
        textTransform: "capitalize",
    },
    nav: { fontSize: 30, fontWeight: "800" },

    modalOverlay: {
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
        marginBottom: 12,
        textTransform: "capitalize",
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 6,
    },

    countRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 10,
    },
    countBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },
    countBtnActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    countText: { fontWeight: "800" },
    countTextActive: { color: "#FFFFFF" },

    serviceRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    serviceTitle: { fontWeight: "700" },
    deleteBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: "#FEE2E2",
    },
    deleteText: { color: "#ff0000", fontWeight: "800" },

    deleteBtnRemove: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#ff0000",
        alignItems: "center",
    },
    deleteTextRemove: { color: "#ffffff", fontWeight: "800" },

    addRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 14,
        alignItems: "center",
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    addBtn: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#111827",
    },
    addText: { color: "#FFFFFF", fontWeight: "800" },

    noPeople: {
        fontSize: 13,
        color: "#9CA3AF",
        fontStyle: "italic",
    },

    footer: {
        flexDirection: "row",
        gap: 12,
        marginTop: 20,
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    cancelText: {
        fontWeight: "700",
        color: "#374151",
    },
    saveBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#2563EB",
        alignItems: "center",
    },
    saveText: {
        fontWeight: "800",
        color: "#FFFFFF",
    },
});
