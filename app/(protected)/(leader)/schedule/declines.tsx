import { useCallback, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import {
    listSchedulesByMonth,
    replaceScheduleAssignment,
    Schedule,
} from "@/src/services/schedules";

import {
    listLeaderMinistryIds,
    listPeopleByIds,
    Person,
} from "@/src/services/people";

import {
    getBestScheduleSuggestion,
    getScheduleSuggestions,
} from "@/src/services/scheduleSuggestions";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";

import { EditScheduleAssignmentModal } from "@/src/components/EditScheduleAssignmentModal";
import { useFocusEffect } from "expo-router";

/* =========================
   SCREEN
========================= */

export default function LeaderScheduleDeclines() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [declinedSchedules, setDeclinedSchedules] = useState<Schedule[]>([]);
    const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});

    const [editingSchedule, setEditingSchedule] =
        useState<Schedule | null>(null);
    const [suggestedPersonId, setSuggestedPersonId] =
        useState<string | null>(null);
    const [replacementCandidates, setReplacementCandidates] =
        useState<Person[]>([]);


    /* =========================
       LOAD DECLINES
    ========================= */

    useFocusEffect(
        useCallback(() => {
            const currentUser = user;
            if (!currentUser) return;
            const personId = currentUser.personId;

            async function load() {
                try {
                    setLoading(true);
                    setError(null);

                    const ministryIds = await listLeaderMinistryIds(personId);

                    const base = new Date();
                    const month = new Date(
                        base.getFullYear(),
                        base.getMonth() + 1,
                        1
                    );

                    const serviceDays = await getServiceDaysByMonth(month);
                    const serviceDayIds = serviceDays.map((d) => d.id);

                    const all: Schedule[] = [];

                    for (const ministryId of ministryIds) {
                        const res = await listSchedulesByMonth({
                            ministryId,
                            serviceDayIds,
                        });

                        res.forEach((s) => {
                            if (
                                s.status === "published" &&
                                s.assignments.some(
                                    (a) => a.attendance === "declined"
                                )
                            ) {
                                all.push(s);
                            }
                        });
                    }

                    setDeclinedSchedules(all);

                    const personIds = Array.from(
                        new Set(
                            all.flatMap((s) =>
                                s.assignments.map((a) => a.personId)
                            )
                        )
                    );

                    if (personIds.length > 0) {
                        const people = await listPeopleByIds(personIds);
                        const map: Record<string, Person> = {};
                        people.forEach((p) => (map[p.id] = p));
                        setPeopleMap(map);
                    }
                } catch (e: any) {
                    setError(e?.message ?? "Erro ao carregar recusas");
                } finally {
                    setLoading(false);
                }
            }

            load();
        }, [user])
    );

    /* =========================
       HELPERS
    ========================= */

    function getPersonName(id: string) {
        return peopleMap[id]?.name ?? id;
    }

    async function openReplaceModal(schedule: Schedule) {
        const suggestion = await getBestScheduleSuggestion({
            ministryId: schedule.ministryId,
            serviceDayId: schedule.serviceDayId,
            scheduleId: schedule.id,
            excludePersonIds: schedule.assignments.map(
                (a) => a.personId
            ),
        });

        // 🔥 BUSCA OS CANDIDATOS REAIS
        const suggestions = await getScheduleSuggestions({
            ministryId: schedule.ministryId,
            serviceDayId: schedule.serviceDayId,
            scheduleId: schedule.id,
            excludePersonIds: schedule.assignments.map(
                (a) => a.personId
            ),
        });

        const candidateIds = suggestions.map((s) => s.personId);

        const people =
            candidateIds.length > 0
                ? await listPeopleByIds(candidateIds)
                : [];

        setReplacementCandidates(people);
        setEditingSchedule(schedule);
        setSuggestedPersonId(suggestion?.personId ?? null);
    }

    async function handleReplace(newPersonId: string) {
        if (!editingSchedule || !user) return;

        const declinedAssignment = editingSchedule.assignments.find(
            (a) => a.attendance === "declined"
        );

        if (!declinedAssignment) return;

        await replaceScheduleAssignment({
            scheduleId: editingSchedule.id,
            oldPersonId: declinedAssignment.personId,
            newPersonId,
            performedBy: user.personId,
        });

        setEditingSchedule(null);
        setSuggestedPersonId(null);

        // reload simples
        setDeclinedSchedules((prev) =>
            prev.filter((s) => s.id !== editingSchedule.id)
        );
    }

    /* =========================
       RENDER
    ========================= */

    return (
        <AppScreen>
            <AppHeader
                title="Recusas de Escala"
                subtitle="Ajuste rápido de substituições"
            />

            <ScrollView>
                <View style={styles.container}>
                    {loading && (
                        <Text style={styles.info}>Carregando...</Text>
                    )}

                    {error && (
                        <Text style={styles.error}>{error}</Text>
                    )}

                    {!loading && declinedSchedules.length === 0 && (
                        <Text style={styles.empty}>
                            Nenhuma recusa registrada 🎉
                        </Text>
                    )}

                    {declinedSchedules.map((s) => {
                        const declined = s.assignments.find(
                            (a) => a.attendance === "declined"
                        );

                        if (!declined) return null;

                        return (
                            <View key={s.id} style={styles.card}>
                                <Text style={styles.title}>
                                    {s.serviceLabel}
                                </Text>

                                <Text style={styles.subtitle}>
                                    {s.serviceDate}
                                </Text>

                                <Text style={styles.person}>
                                    ❌ {getPersonName(declined.personId)}
                                </Text>

                                <Pressable
                                    style={styles.fixBtn}
                                    onPress={() => openReplaceModal(s)}
                                >
                                    <Text style={styles.fixText}>
                                        Sugerir substituto
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>

            {/* MODAL */}
            <EditScheduleAssignmentModal
                visible={!!editingSchedule}
                scheduleLabel={editingSchedule?.serviceLabel ?? ""}
                people={replacementCandidates}
                currentPersonId={
                    editingSchedule?.assignments.find(
                        (a) => a.attendance === "declined"
                    )?.personId ?? ""
                }
                suggestedPersonId={suggestedPersonId}
                onCancel={() => {
                    setEditingSchedule(null);
                    setSuggestedPersonId(null);
                    setReplacementCandidates([]);
                }}
                onConfirm={handleReplace}
            />
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
        color: "#6B7280",
        fontWeight: "600",
    },
    error: {
        color: "#DC2626",
        fontWeight: "800",
    },
    empty: {
        color: "#6B7280",
        fontStyle: "italic",
    },
    card: {
        backgroundColor: "#FFF",
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    title: {
        fontWeight: "900",
        fontSize: 16,
    },
    subtitle: {
        color: "#6B7280",
        marginBottom: 6,
    },
    person: {
        fontWeight: "800",
        marginBottom: 10,
    },
    fixBtn: {
        backgroundColor: "#2563EB",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },
    fixText: {
        color: "#FFF",
        fontWeight: "900",
    },
});
