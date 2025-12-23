// src/app/(admin)/people.tsx
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  createMembership,
  listMemberships,
  Membership,
  MembershipRole,
  updateMembership
} from "@/src/services/memberships";
import {
  listActiveMinistries,
  Ministry,
} from "@/src/services/ministries";
import {
  listPeople,
  Person,
  updatePerson,
} from "@/src/services/people";

import {
  SYSTEM_ROLE_LABEL,
  SystemRole,
} from "@/src/contexts/AuthContext";

/* =========================
   COMPONENT
========================= */

export default function AdminPeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD
  ========================= */

  async function load() {
    setLoading(true);
    const [p, m, mem] = await Promise.all([
      listPeople(),
      listActiveMinistries(),
      listMemberships(),
    ]);

    setPeople(p);
    setMinistries(m);
    setMemberships(mem);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* =========================
     ACTIONS
  ========================= */

  async function changeRole(
    person: Person,
    role: SystemRole
  ) {
    await updatePerson(person.uid, { role });
    await load();
  }

  async function addMembership(
    person: Person,
    ministry: Ministry
  ) {
    await createMembership({
      personId: person.uid,
      ministryId: ministry.id,
      role: "member",
      status: "active",
      personName: person.name,
      personEmail: person.email,
      ministryName: ministry.name,
    });

    await load();
  }

  async function toggleMembership(mem: Membership) {
    await updateMembership(mem.id, {
      status: mem.status === "active" ? "inactive" : "active",
    });
    await load();
  }

  async function changeMembershipRole(
    mem: Membership,
    role: MembershipRole
  ) {
    await updateMembership(mem.id, { role });
    await load();
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pessoas</Text>

      <ScrollView>
        {loading && <Text>Carregando…</Text>}

        {people.map((p) => (
          <View key={p.uid} style={styles.personCard}>
            <Text style={styles.personName}>{p.name}</Text>
            <Text style={styles.personEmail}>{p.email}</Text>

            {/* SYSTEM ROLE */}
            <View style={styles.roleRow}>
              {(["admin", "leader", "member"] as SystemRole[]).map(
                (r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleBtn,
                      p.role === r && styles.roleActive,
                    ]}
                    onPress={() => changeRole(p, r)}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        p.role === r && { color: "#FFFFFF" },
                      ]}
                    >
                      {SYSTEM_ROLE_LABEL[r]}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* MINISTRIES */}
            {ministries.map((m) => {
              const mem = memberships.find(
                (x) =>
                  x.personId === p.uid &&
                  x.ministryId === m.id
              );

              return (
                <View key={m.id} style={styles.ministryRow}>
                  <Text>{m.name}</Text>

                  {mem ? (
                    <View style={{ gap: 4, alignItems: "flex-end" }}>
                      {/* ROLE NO MINISTÉRIO */}
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {(["leader", "member"] as MembershipRole[]).map(
                          (r) => (
                            <TouchableOpacity
                              key={r}
                              style={[
                                styles.roleMini,
                                mem.role === r && styles.roleMiniActive,
                              ]}
                              onPress={() => changeMembershipRole(mem, r)}
                            >
                              <Text
                                style={[
                                  styles.roleMiniText,
                                  mem.role === r && { color: "#FFFFFF" },
                                ]}
                              >
                                {r === "leader" ? "Líder" : "Membro"}
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>

                      {/* STATUS */}
                      <TouchableOpacity
                        style={[
                          styles.toggle,
                          mem.status === "inactive" && {
                            backgroundColor: "#FEE2E2",
                          },
                        ]}
                        onPress={() => toggleMembership(mem)}
                      >
                        <Text style={styles.toggleText}>{mem.status}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => addMembership(p, m)}
                    >
                      <Text style={styles.addText}>Vincular</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  personCard: {
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    gap: 8,
  },
  personName: {
    fontWeight: "800",
  },
  personEmail: {
    color: "#6B7280",
  },

  roleRow: {
    flexDirection: "row",
    gap: 6,
    marginVertical: 6,
  },
  roleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  roleActive: {
    backgroundColor: "#2563EB",
  },
  roleText: {
    fontWeight: "800",
    fontSize: 12,
    color: "#111827",
  },

  ministryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  addText: {
    fontWeight: "800",
    fontSize: 12,
  },
  toggle: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleText: {
    fontWeight: "800",
    fontSize: 12,
  },
  roleMini: {
    backgroundColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleMiniActive: {
    backgroundColor: "#1E3A8A",
  },
  roleMiniText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#111827",
  },
});
