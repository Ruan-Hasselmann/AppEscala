import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { listMinistries } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AdminMinistryMembers() {
  const { ministryId } = useLocalSearchParams<{ ministryId: string }>();
  const { user, logout } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [ministryName, setMinistryName] = useState("");

  useEffect(() => {
    async function load() {
      const [p, m] = await Promise.all([
        listPeople(),
        listMinistries(),
      ]);

      const ministry = m.find((x) => x.id === ministryId);
      setMinistryName(ministry?.name ?? "");

      const filtered = p
        .filter((person) =>
          person.ministries.some(
            (x) => x.ministryId === ministryId
          )
        )
        .sort((a, b) =>
          a.name.localeCompare(b.name, "pt-BR", {
            sensitivity: "base",
          })
        );

      setPeople(filtered);
    }

    load();
  }, [ministryId]);

  return (
    <AppScreen>
      <AppHeader
        title={ministryName}
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />

      <View style={styles.container}>
        {people.length === 0 ? (
          <Text style={styles.empty}>
            Nenhuma pessoa neste ministério
          </Text>
        ) : (
          people.map((p) => {
            const entry = p.ministries.find(
              (x) => x.ministryId === ministryId
            );

            return (
              <View key={p.id} style={styles.card}>
                <View>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.email}>{p.email}</Text>
                </View>

                <Text
                  style={
                    entry?.role === "leader"
                      ? styles.leader
                      : styles.member
                  }
                >
                  {entry?.role === "leader"
                    ? "⭐ Líder"
                    : "Membro"}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#6B7280",
  },

  card: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  name: { fontWeight: "800" },
  email: { fontSize: 13, color: "#6B7280" },

  leader: {
    color: "#2563EB",
    fontWeight: "800",
  },

  member: {
    color: "#6B7280",
    fontWeight: "700",
  },
});
