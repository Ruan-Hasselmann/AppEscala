import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { getScheduleByService, publishSchedule, saveScheduleDraft } from "@/src/services/schedules";

import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

/* =========================
   TYPES
========================= */

type AssignedPerson = {
    personId: string;
    ministryId: string;
};

/* =========================
   SCREEN
========================= */

export default function LeaderGenerateSchedule() {
    const { user, logout } = useAuth();

    const {
        serviceDayId,
        serviceLabel,
        ministryId,
        name,
        date,
    } = useLocalSearchParams<{
        serviceDayId?: string;
        serviceLabel?: string;
        ministryId?: string;
        name?: string;
        date?: string;
    }>();

    const [people, setPeople] = useState<Person[]>([]);
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [assigned, setAssigned] = useState<AssignedPerson[]>([]);
    const [showSavedModal, setShowSavedModal] = useState(false);
    const [scheduleStatus, setScheduleStatus] =
        useState<"draft" | "published" | "empty">("empty");
    const [showPublishModal, setShowPublishModal] = useState(false);


    /* =========================
       LOAD
    ========================= */

    async function loadSchedule() {
        if (!serviceDayId || !serviceLabel || !ministryId) return;

        const [p, m, existing] = await Promise.all([
            listPeople(),
            listMinistries(),
            getScheduleByService({
                serviceDayId,
                serviceLabel,
                ministryId,
            }),
        ]);

        setPeople(p.filter((x) => x.active));
        setMinistries(m.filter((x) => x.active));

        if (existing) {
            setAssigned(
                existing.people.map((p) => ({
                    personId: p.personId,
                    ministryId,
                }))
            );
            setScheduleStatus(existing.status);
        } else {
            setAssigned([]);
            setScheduleStatus("empty");
        }
    }

    useFocusEffect(
        useCallback(() => {
            loadSchedule();
        }, [serviceDayId, serviceLabel, ministryId])
    );

    const currentMinistry = ministries.find(
        (m) => m.id === ministryId
    );

    /* =========================
       RULE 1
    ========================= */

    const unavailablePersonIds = useMemo(
        () => assigned.map((a) => a.personId),
        [assigned]
    );

    const availablePeople = useMemo(() => {
        if (!ministryId) return [];

        return people
            .filter((p) =>
                p.ministries.some(
                    (m) => m.ministryId === ministryId
                )
            )
            .filter(
                (p) => !unavailablePersonIds.includes(p.id)
            )
            .sort((a, b) =>
                a.name.localeCompare(b.name, "pt-BR")
            );
    }, [people, ministryId, unavailablePersonIds]);

    /* =========================
       ACTIONS
    ========================= */

    function assignPerson(person: Person) {
        if (!ministryId) return;

        setAssigned((prev) => [
            ...prev,
            { personId: person.id, ministryId },
        ]);
    }

    function removePerson(personId: string) {
        setAssigned((prev) =>
            prev.filter((x) => x.personId !== personId)
        );
    }

    const assignedForThisMinistry = assigned.filter(
        (x) => x.ministryId === ministryId
    );

    async function handleSaveDraft() {
        if (!serviceDayId || !serviceLabel || !ministryId) {
            return;
        }

        await saveScheduleDraft({
            serviceDayId,
            serviceLabel,
            ministryId,
            people: assignedForThisMinistry.map((a) => {
                const person = people.find(
                    (p) => p.id === a.personId
                );
                return {
                    personId: a.personId,
                    name: person?.name ?? "",
                };
            }),
        });

        setShowSavedModal(true);
    }

    async function handlePublish() {
        if (!serviceDayId || !serviceLabel || !ministryId) return;

        await publishSchedule({
            serviceDayId,
            serviceLabel,
            ministryId,
        });

        setScheduleStatus("published");
        setShowPublishModal(false);
        router.push({
            pathname: "/(protected)/(leader)/schedule"
        })
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title={currentMinistry?.name ?? "Escala"}
                subtitle={`${name ?? ""} · Líder`}
                onLogout={logout}
            />

            <ScrollView>
                <View style={styles.container}>
                    <Text style={styles.sectionInfo}>
                        Escala para: {serviceLabel} {date}
                    </Text>
                    <View
                        style={[
                            styles.statusBadge,
                            scheduleStatus === "published" && styles.statusPublished,
                            scheduleStatus === "draft" && styles.statusDraft,
                            scheduleStatus === "empty" && styles.statusEmpty,
                        ]}
                    >
                        <Text style={styles.statusText}>
                            {scheduleStatus === "published"
                                ? "Escala publicada"
                                : scheduleStatus === "draft"
                                    ? "Rascunho"
                                    : "Nenhuma escala criada"}
                        </Text>
                    </View>
                    <Text style={styles.sectionTitle}>
                        Pessoas escaladas
                    </Text>

                    {assignedForThisMinistry.length === 0 ? (
                        <Text style={styles.empty}>
                            Nenhuma pessoa escalada ainda
                        </Text>
                    ) : (
                        assignedForThisMinistry.map((a) => {
                            const person = people.find(
                                (p) => p.id === a.personId
                            );
                            if (!person) return null;

                            return (
                                <View key={a.personId} style={styles.card}>
                                    <Text style={styles.name}>
                                        {person.name}
                                    </Text>
                                    <Pressable
                                        onPress={() =>
                                            removePerson(person.id)
                                        }
                                    >
                                        <Text style={styles.remove}>
                                            Remover
                                        </Text>
                                    </Pressable>
                                </View>
                            );
                        })
                    )}

                    <Pressable
                        style={styles.saveBtn}
                        onPress={handleSaveDraft}
                    >
                        <Text style={styles.saveText}>
                            Salvar como rascunho
                        </Text>
                    </Pressable>
                    {scheduleStatus === "draft" && (
                        <Pressable
                            style={styles.publishBtn}
                            onPress={() => setShowPublishModal(true)}
                        >
                            <Text style={styles.publishText}>
                                Publicar escala
                            </Text>
                        </Pressable>
                    )}

                    <Text style={styles.sectionTitle}>
                        Pessoas disponíveis
                    </Text>

                    {availablePeople.map((p) => (
                        <Pressable
                            key={p.id}
                            style={styles.card}
                            onPress={() => assignPerson(p)}
                        >
                            <Text style={styles.name}>{p.name}</Text>
                            <Text style={styles.add}>Adicionar</Text>
                        </Pressable>
                    ))}
                </View>
                <Modal
                    visible={showSavedModal}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.overlay}>
                        <View style={styles.modal}>
                            <Text style={styles.modalTitle}>
                                Escala salva
                            </Text>

                            <Text style={styles.modalText}>
                                A escala foi salva com sucesso como rascunho.
                                Você pode continuar editando ou voltar depois.
                            </Text>

                            <Pressable
                                style={styles.modalBtn}
                                onPress={async () => {
                                    setShowSavedModal(false);
                                    await loadSchedule(); // 🔥 força refresh
                                }}
                            >
                                <Text style={styles.modalBtnText}>
                                    Entendi
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={showPublishModal}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.overlay}>
                        <View style={styles.modal}>
                            <Text style={styles.modalTitle}>
                                Publicar escala
                            </Text>

                            <Text style={styles.modalText}>
                                Após publicar, a escala ficará visível para os membros
                                e não poderá ser editada.
                            </Text>

                            <Pressable
                                style={styles.modalPrimary}
                                onPress={handlePublish}
                            >
                                <Text style={styles.modalPrimaryText}>
                                    Confirmar publicação
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.modalSecondary}
                                onPress={() => setShowPublishModal(false)}
                            >
                                <Text style={styles.modalSecondaryText}>
                                    Cancelar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </AppScreen>
    );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },

    info: {
        fontSize: 13,
        color: "#374151",
        marginBottom: 16,
    },

    sectionTitle: {
        fontWeight: "800",
        marginTop: 16,
        marginBottom: 8,
    },
    sectionInfo: {
        fontWeight: "900",
        marginTop: 8,
        marginBottom: 8,
        fontSize: 15,
        color: "#ff0000",
    },

    empty: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 8,
    },

    card: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    name: {
        fontWeight: "700",
    },

    add: {
        color: "#2563EB",
        fontWeight: "800",
    },

    remove: {
        color: "#DC2626",
        fontWeight: "800",
    },
    saveBtn: {
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#111827",
        alignItems: "center",
    },

    saveText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
    },

    modal: {
        width: "85%",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: "900",
        marginBottom: 8,
        color: "#111827",
    },

    modalText: {
        fontSize: 14,
        color: "#374151",
        marginBottom: 20,
    },

    modalBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#111827",
        alignItems: "center",
    },

    modalBtnText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginBottom: 8,
    },

    statusPublished: {
        backgroundColor: "#DCFCE7",
    },

    statusDraft: {
        backgroundColor: "#FEF3C7",
    },

    statusEmpty: {
        backgroundColor: "#E5E7EB",
    },

    statusText: {
        fontWeight: "800",
        fontSize: 12,
        color: "#111827",
    },
    publishBtn: {
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#16A34A",
        alignItems: "center",
    },

    publishText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },

    modalPrimary: {
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: "#16A34A",
        alignItems: "center",
        marginBottom: 8,
    },

    modalPrimaryText: {
        color: "#FFFFFF",
        fontWeight: "800",
    },

    modalSecondary: {
        paddingVertical: 12,
        alignItems: "center",
    },

    modalSecondaryText: {
        color: "#6B7280",
        fontWeight: "700",
    },

});
