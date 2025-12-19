import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import { LeaderPerson, listLeaderPeople } from "../../../src/services/leader";
import { listMembershipsByPerson } from "../../../src/services/memberships";
import { listAllMinistries, Ministry } from "../../../src/services/ministries";
import { getPersonByEmail } from "../../../src/services/people";

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

  useEffect(() => {
    async function load() {
      try {
        if (!user?.email) {
          setGroups([]);
          return;
        }

        // 🔑 PASSO 1 — resolve person pelo email
        const person = await getPersonByEmail(user.email);

        if (!person) {
          setGroups([]);
          return;
        }

        // 🔑 PASSO 2 — memberships do leader
        const memberships = await listMembershipsByPerson(person.id);

        const leaderMinistryIds = memberships
          .filter(
            (m) => m.role === "leader" && m.status === "active"
          )
          .map((m) => m.ministryId);

        if (leaderMinistryIds.length === 0) {
          setGroups([]);
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
      } finally {
        setLoading(false);
      }
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
          <Text style={styles.groupTitle}>{ministry.name}</Text>

          {people.map(({ person, membership }) => (
            <View key={membership.id} style={styles.card}>
              <View>
                <Text style={styles.name}>{person.name}</Text>
                <Text style={styles.email}>{person.email}</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { color: "#374151", marginBottom: 16 },
  group: { marginBottom: 20 },
  groupTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E3A8A",
    marginBottom: 8,
  },
  empty: { color: "#6B7280" },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  name: { fontWeight: "900", fontSize: 15 },
  email: { fontSize: 13, color: "#374151" },
});
