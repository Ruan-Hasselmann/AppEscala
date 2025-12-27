import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";

import {
    createServiceDay,
    deleteServiceDay,
    getServiceDaysByMonth,
    ServiceDay,
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
    shift: "manha" | "tarde" | "noite" | "custom";
    label: string;
};

const SHIFT_LABEL: Record<
    "manha" | "tarde" | "noite" | "custom",
    string
> = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite",
    custom: "Personalizado",
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
       HELPERS
    ========================= */

    function createDraft(count: number) {
        const presets = [
            { shift: "manha", label: "Manhã" },
            { shift: "noite", label: "Noite" },
            { shift: "tarde", label: "Tarde" },
        ] as const;

        setDraftServices(
            Array.from({ length: count }).map((_, i) => ({
                shift: presets[i]?.shift ?? "custom",
                label: presets[i]?.label ?? `Culto ${i + 1}`,
            }))
        );
    }

    function updateDraft(index: number, patch: Partial<DraftService>) {
        setDraftServices((prev) =>
            prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
        );
    }

    /* =========================
       SAVE
    ========================= */

    async function handleSave() {
        if (!date || draftServices.length === 0) return;

        let day = serviceDay;

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
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    style={styles.container}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <ScrollView style={styles.modal}>
                        <Text style={styles.title}>
                            {date?.toLocaleDateString("pt-BR", {
                                weekday: "long",
                                day: "2-digit",
                                month: "long",
                            })}
                        </Text>

                        {/* DIA JÁ EXISTE */}
                        {serviceDay ? (
                            <>
                                <Text style={styles.section}>Cultos cadastrados</Text>

                                {existingServices.length === 0 ? (
                                    <Text style={styles.muted}>Nenhum culto encontrado</Text>
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
                            <View>
                                <Text style={styles.section}>
                                    Quantos cultos este dia terá?
                                </Text>

                                <View style={styles.row}>
                                    {[1, 2, 3, 4].map((n) => (
                                        <Pressable
                                            key={n}
                                            style={[
                                                styles.countBtn,
                                                draftServices.length === n && styles.countActive,
                                            ]}
                                            onPress={() => createDraft(n)}
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

                                {draftServices.map((s, i) => (
                                    <View key={i} style={styles.serviceBox}>
                                        <Text style={styles.serviceTitle}>
                                            Culto {i + 1}
                                        </Text>

                                        <View style={styles.shiftRow}>
                                            {(["manha", "tarde", "noite", "custom"] as const).map((opt) => (
                                                <Pressable
                                                    key={opt}
                                                    style={[
                                                        styles.shiftBtn,
                                                        s.shift === opt && styles.shiftActive,
                                                    ]}
                                                    onPress={() =>
                                                        updateDraft(i, {
                                                            shift: opt,
                                                            label:
                                                                opt === "custom"
                                                                    ? ""
                                                                    : SHIFT_LABEL[opt],
                                                        })
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            styles.shiftText,
                                                            s.shift === opt && styles.shiftTextActive,
                                                        ]}
                                                    >
                                                        {SHIFT_LABEL[opt]}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                        {s.shift === "custom" && (
                                            <TextInput
                                                placeholder="Ex: Culto Jovem, 18h, Vigília"
                                                value={s.label}
                                                onChangeText={(t) =>
                                                    updateDraft(i, { label: t })
                                                }
                                                style={styles.input}
                                            />
                                        )}
                                    </View>
                                ))}

                                <Pressable
                                    style={[
                                        styles.save,
                                        draftServices.some((s) => !s.label.trim()) && {
                                            opacity: 0.5,
                                        },
                                    ]}
                                    disabled={draftServices.some((s) => !s.label.trim())}
                                    onPress={handleSave}
                                >
                                    <Text style={styles.saveText}>Salvar</Text>
                                </Pressable>

                                <Pressable style={styles.cancel} onPress={onClose}>
                                    <Text>Cancelar</Text>
                                </Pressable>
                            </View>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
            <Modal
                visible={confirmRemove}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmRemove(false)}
            >
                <View style={styles.overlayConfirm}>
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
    container: { padding: 16 },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
    },
    overlayConfirm: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        padding: 16,
    },
    modal: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 20,
        //maxHeight: "85%",
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
        marginBottom: 16,
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
    serviceBox: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    serviceTitle: {
        fontWeight: "800",
        marginBottom: 6,
    },
    shiftRow: {
        flexDirection: "row",
        gap: 6,
        marginBottom: 8,
    },
    shiftBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    shiftActive: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    shiftText: {
        fontSize: 12,
        fontWeight: "700",
    },
    shiftTextActive: {
        color: "#FFF",
    },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 10,
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
        backgroundColor: "#DC2626",
        alignItems: "center",
    },
    removeText: {
        color: "#FFF",
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
