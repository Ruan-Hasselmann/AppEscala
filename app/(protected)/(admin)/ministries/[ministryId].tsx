import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";

import { PersonManageModal } from "@/src/components/admin/PersonManageModal";

import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AdminMinistryMembers() {
  const { ministryId } = useLocalSearchParams<{ ministryId: string }>();
  const { user, logout } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [ministryName, setMinistryName] = useState("");

  const [selected, setSelected] = useState<Person | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  /* =========================
     LOAD
  ========================= */

  async function load() {
    const [p, m] = await Promise.all([
      listPeople(),
      listMinistries(),
    ]);

    setMinistries(m);

    const ministry = m.find((x) => x.id === ministryId);
    setMinistryName(ministry?.name ?? "");

    const filtered = p
      .filter((person) =>
        person.ministries.some(
          (x) => x.ministryId === ministryId
        )
      )
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "pt-BR",
          { sensitivity: "base" }
        )
      );

    setPeople(filtered);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [ministryId])
  );

  /* =========================
     RENDER
  ========================= */

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

                <Pressable
                  style={styles.manage}
                  onPress={() => {
                    setSelected(p);
                    setModalOpen(true);
                  }}
                >
                  <Text style={styles.manageText}>
                    Gerenciar
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>

      {/* MODAL DE EDIÇÃO (REAPROVEITADO) */}
      <PersonManageModal
        visible={modalOpen}
        person={selected}
        ministries={ministries}
        onClose={() => {
          setSelected(null);
          setModalOpen(false);
        }}
        onSaved={load}
      />
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

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
    alignItems: "center",
  },

  name: { fontWeight: "800" },
  email: { fontSize: 13, color: "#6B7280" },

  leader: {
    marginTop: 4,
    color: "#2563EB",
    fontWeight: "800",
  },

  member: {
    marginTop: 4,
    color: "#6B7280",
    fontWeight: "700",
  },

  manage: {
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  manageText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },
});
