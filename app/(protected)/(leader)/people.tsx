import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import {
    LeaderPerson,
    listLeaderPeople,
} from "../../../src/services/leader";
import {
    listMembershipsByPerson,
} from "../../../src/services/memberships";
import {
    listAllMinistries,
    Ministry,
} from "../../../src/services/ministries";

/* =========================
   TYPES
========================= */

type LeaderMinistryGroup = {
    ministry: Ministry;
    people: LeaderPerson[];
};

/* =========================
   COMPONENT
========================= */

export default function LeaderPeople() {
    const { user } = useAuth();

    if (!user || user.role !== "leader") return null;

    const [groups, setGroups] = useState<LeaderMinistryGroup[]>([]);
    const [loading, setLoading] = useState(true);

    /* =========================
       LOAD
    ========================= */

    useEffect(() => {
        if (!user || user.role !== "leader") return;

        const uid = user.uid; // ✅ agora é string garantida

        async function load() {
            const memberships = await listMembershipsByPerson(uid);

            const leaderMinistryIds = memberships
                .filter((m) => m.role === "leader")
                .map((m) => m.ministryId);

            if (leaderMinistryIds.length === 0) {
                setGroups([]);
                setLoading(false);
                return;
            }

            const allMinistries = await listAllMinistries();
            const leaderMinistries = allMinistries.filter((m) =>
                leaderMinistryIds.includes(m.id)
            );

            const result: LeaderMinistryGroup[] = [];

            for (const ministry of leaderMinistries) {
                const people = await listLeaderPeople(ministry.id);
                result.push({ ministry, people });
            }

            setGroups(result);
            setLoading(false);
        }

        load();
    }, [user]);

    /* =========================
       RENDER
    ========================= */

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Carregando…</Text>
            </View>
        );
    }

    if (groups.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={styles.empty}>
                    Você não é líder de nenhum ministério.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Pessoas por Ministério</Text>
            <Text style={styles.subtitle}>
                Visualize quem faz parte das equipes que você lidera
            </Text>

            {groups.map(({ ministry, people }) => (
                <View key={ministry.id} style={styles.group}>
                    {/* HEADER DO MINISTÉRIO */}
                    <Text style={styles.groupTitle}>
                        {ministry.name}
                    </Text>

                    {people.length === 0 && (
                        <Text style={styles.empty}>
                            Nenhuma pessoa ativa neste ministério.
                        </Text>
                    )}

                    {people.map(({ person, membership }) => (
                        <View key={membership.id} style={styles.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{person.name}</Text>
                                <Text style={styles.email}>{person.email}</Text>

                                <View style={styles.badges}>
                                    <Badge
                                        label={
                                            membership.role === "leader"
                                                ? "Líder"
                                                : "Membro"
                                        }
                                        color="#DBEAFE"
                                    />

                                    <Badge
                                        label={
                                            membership.status === "active"
                                                ? "Ativo"
                                                : "Convidado"
                                        }
                                        color={
                                            membership.status === "active"
                                                ? "#D1FAE5"
                                                : "#FEF3C7"
                                        }
                                    />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            ))}
        </ScrollView>
    );
}

/* =========================
   BADGE
========================= */

function Badge({
    label,
    color,
}: {
    label: string;
    color: string;
}) {
    return (
        <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{label}</Text>
        </View>
    );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
    container: { padding: 16 },

    title: { fontSize: 22, fontWeight: "900" },
    subtitle: {
        color: "#374151",
        marginBottom: 16,
    },

    group: {
        marginBottom: 20,
    },

    groupTitle: {
        fontSize: 18,
        fontWeight: "900",
        color: "#1E3A8A",
        marginBottom: 8,
    },

    empty: {
        color: "#6B7280",
        marginBottom: 8,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 14,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
    },

    name: {
        fontWeight: "900",
        fontSize: 15,
        color: "#111827",
    },
    email: {
        fontSize: 13,
        color: "#374151",
        marginTop: 2,
    },

    badges: {
        flexDirection: "row",
        gap: 6,
        marginTop: 8,
    },

    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: "800",
        color: "#111827",
    },
});
