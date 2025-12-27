import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import {
    createServiceDay,
    deleteServiceDay,
    getServiceDaysByMonth,
    ServiceDay
} from "@/src/services/serviceDays";
import {
    createService,
    getServicesByServiceDay,
    Service,
} from "@/src/services/services";

/* =========================
   TYPES
========================= */

type DraftService = {
    label: string;
    shift: "manha" | "tarde" | "noite" | "custom";
};

type Props = {
    visible: boolean;
    date: Date | null;
    serviceDay: ServiceDay | null;
    onClose: () => void;
    onSaved: () => Promise<void>;
};

/* =========================
   COMPONENT
========================= */

export function AdminServiceDayModal({
    visible,
    date,
    serviceDay,
    onClose,
    onSaved,
}: Props) {
    const [draftServices, setDraftServices] = useState<DraftService[]>([]);
    const [existingServices, setExistingServices] = useState<Service[]>([]);
    const [customLabel, setCustomLabel] = useState("");
    const [confirmRemove, setConfirmRemove] = useState(false);

    /* =========================
       LOAD EXISTING
    ========================= */

    useEffect(() => {
        if (!visible) return;

        if (!serviceDay) {
            setExistingServices([]);
            setDraftServices([]);
            return;
        }

        getServicesByServiceDay(serviceDay.id).then(setExistingServices);
    }, [visible, serviceDay]);

    /* =========================
       ACTIONS
    ========================= */

    function selectCount(n: number) {
        const labels = ["Manhã", "Noite", "Tarde"];
        const shifts = ["manha", "noite", "tarde"] as const;

        setDraftServices(
            Array.from({ length: n }).map((_, i) => ({
                label: labels[i] ?? `Culto ${i + 1}`,
                shift: shifts[i] ?? "custom",
            }))
        );
    }

    function addCustomService() {
        if (!customLabel.trim()) return;

        setDraftServices((prev) => [
            ...prev,
            { label: customLabel.trim(), shift: "custom" },
        ]);

        setCustomLabel("");
    }

    async function handleSave() {
        if (!date) return;

        let day = serviceDay;

        // cria o dia apenas se ainda não existir
        if (!day) {
            await createServiceDay(date);

            const days = await getServiceDaysByMonth(
                new Date(date.getFullYear(), date.getMonth(), 1)
            );

            day =
                days.find(
                    (d) =>
                        d.date.getDate() === date.getDate() &&
                        d.date.getMonth() === date.getMonth() &&
                        d.date.getFullYear() === date.getFullYear()
                ) ?? null;
        }

        if (!day) return;

        for (let i = 0; i < draftServices.length; i++) {
            const s = draftServices[i];

            await createService({
                serviceDayId: day.id,
                label: s.label,
                order: i + 1,
                type: draftServices.length === 1 ? "single" : "multiple",
                shift: s.shift,
            });
        }

        await onSaved();
        onClose();
    }

    async function handleRemoveDay() {
        if (!serviceDay) return;

        setConfirmRemove(true);
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <View style={styles.modal}>
                        <Text style={styles.title}>
                            {date?.toLocaleDateString("pt-BR", {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                            })}
                        </Text>

                        {/* DIA EXISTENTE */}
                        {serviceDay ? (
                            <>
                                <Text style={styles.section}>Cultos cadastrados</Text>

                                {existingServices.length === 0 ? (
                                    <Text style={styles.muted}>
                                        Nenhum culto encontrado
                                    </Text>
                                ) : (
                                    existingServices.map((s) => (
                                        <Text key={s.id} style={styles.item}>
                                            • {s.label}
                                        </Text>
                                    ))
                                )}

                                <Pressable
                                    style={styles.remove}
                                    onPress={handleRemoveDay}
                                >
                                    <Text style={styles.removeText}>
                                        Remover dia de culto
                                    </Text>
                                </Pressable>

                                <Pressable style={styles.close} onPress={onClose}>
                                    <Text style={styles.closeText}>Fechar</Text>
                                </Pressable>
                            </>
                        ) : (
                            <>
                                {/* NOVO DIA */}
                                <Text style={styles.section}>
                                    Quantos cultos este dia terá?
                                </Text>

                                <View style={styles.row}>
                                    {[1, 2, 3].map((n) => (
                                        <Pressable
                                            key={n}
                                            style={[
                                                styles.countBtn,
                                                draftServices.length === n &&
                                                styles.countActive,
                                            ]}
                                            onPress={() => selectCount(n)}
                                        >
                                            <Text
                                                style={[
                                                    styles.countText,
                                                    draftServices.length === n &&
                                                    styles.countTextActive,
                                                ]}
                                            >
                                                {n}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                {/* CUSTOM */}
                                <View style={styles.customRow}>
                                    <TextInput
                                        placeholder="Culto especial (ex: 18h)"
                                        value={customLabel}
                                        onChangeText={setCustomLabel}
                                        style={styles.input}
                                    />
                                    <Pressable
                                        style={styles.addCustom}
                                        onPress={addCustomService}
                                    >
                                        <Text style={styles.addCustomText}>
                                            Adicionar
                                        </Text>
                                    </Pressable>
                                </View>

                                <Pressable
                                    style={[
                                        styles.save,
                                        draftServices.length === 0 && { opacity: 0.5 },
                                    ]}
                                    disabled={draftServices.length === 0}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.saveText}>Salvar</Text>
                                </Pressable>

                                <Pressable style={styles.cancel} onPress={onClose}>
                                    <Text>Cancelar</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
            <Modal
                visible={confirmRemove}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmRemove(false)}
            >
                <View style={styles.overlay}>
                    <View style={styles.confirmModal}>
                        <Text style={styles.confirmTitle}>
                            Remover dia de culto
                        </Text>

                        <Text style={styles.confirmText}>
                            Essa ação removerá todos os cultos deste dia e não poderá ser desfeita.
                            Deseja continuar?
                        </Text>

                        <View style={styles.confirmActions}>
                            <Pressable
                                style={styles.confirmCancel}
                                onPress={() => setConfirmRemove(false)}
                            >
                                <Text style={styles.confirmCancelText}>
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.confirmRemove}
                                onPress={async () => {
                                    if (!serviceDay) return;

                                    await deleteServiceDay(serviceDay.id);
                                    setConfirmRemove(false);
                                    await onSaved();
                                    onClose();
                                }}
                            >
                                <Text style={styles.confirmRemoveText}>
                                    Remover
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: 20,
    },
    modal: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 12,
        textTransform: "capitalize",
    },
    section: {
        fontWeight: "700",
        marginBottom: 8,
    },
    muted: {
        fontStyle: "italic",
        color: "#6B7280",
    },
    item: {
        fontWeight: "700",
        marginBottom: 6,
    },
    row: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    countBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    countActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    countText: {
        fontWeight: "800",
    },
    countTextActive: {
        color: "#FFF",
    },
    customRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    addCustom: {
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#111827",
        justifyContent: "center",
    },
    addCustomText: {
        color: "#FFF",
        fontWeight: "800",
    },
    save: {
        padding: 14,
        borderRadius: 14,
        backgroundColor: "#2563EB",
        alignItems: "center",
        marginBottom: 8,
    },
    saveText: {
        color: "#FFF",
        fontWeight: "800",
    },
    cancel: {
        padding: 12,
        alignItems: "center",
    },
    remove: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#FFF",
        alignItems: "center",
    },
    removeText: {
        color: "#DC2626",
        fontWeight: "800",
    },
    close: {
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#111827",
        alignItems: "center",
    },
    closeText: {
        color: "#FFF",
        fontWeight: "800",
    },
    confirmModal: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 20,
    },

    confirmTitle: {
        fontSize: 18,
        fontWeight: "800",
        marginBottom: 8,
    },

    confirmText: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 20,
    },

    confirmActions: {
        flexDirection: "row",
        gap: 12,
    },

    confirmCancel: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },

    confirmCancelText: {
        fontWeight: "700",
        color: "#374151",
    },

    confirmRemove: {
        flex: 1,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#DC2626",
        alignItems: "center",
    },

    confirmRemoveText: {
        color: "#FFF",
        fontWeight: "800",
    },
});
