import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { saveScheduleDraft } from "@/src/services/schedules";

import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

    /* =========================
       LOAD
    ========================= */

    useFocusEffect(
        useCallback(() => {
            async function load() {
                const [p, m] = await Promise.all([
                    listPeople(),
                    listMinistries(),
                ]);

                setPeople(p.filter((x) => x.active));
                setMinistries(m.filter((x) => x.active));
            }

            load();
        }, [])
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
            alert(serviceDayId);
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

        alert("Escala salva como rascunho");
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

});
