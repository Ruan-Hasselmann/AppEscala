import { PersonManageModal } from "@/src/components/admin/PersonManageModal";
import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistries, Ministry } from "@/src/services/ministries";
import {
  listPeople,
  Person,
  togglePersonStatus,
  updatePersonMinistries,
} from "@/src/services/people";
import { useFocusEffect } from "expo-router";

import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

/* =========================
   TYPES
========================= */

type StatusFilter = "active" | "all" | "without" | "inactive";

type SelectedMinistry = {
  ministryId: string;
  role: "leader" | "member";
};

/* =========================
   SCREEN
========================= */

export default function AdminPeople() {
  const { user, logout } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("active");
  const [ministryFilter, setMinistryFilter] =
    useState<string | "all">("all");

  const [statusDropdownOpen, setStatusDropdownOpen] =
    useState(false);
  const [ministryDropdownOpen, setMinistryDropdownOpen] =
    useState(false);

  const [selected, setSelected] = useState<Person | null>(null);
  const [selectedMinistries, setSelectedMinistries] =
    useState<SelectedMinistry[]>([]);
  const [active, setActive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  /* =========================
     LOAD
  ========================= */

  async function load() {
    const [p, m] = await Promise.all([
      listPeople(),
      listMinistries(),
    ]);

    setPeople(p);
    setMinistries(m.filter((x) => x.active));
  }

  useFocusEffect(
    useCallback(() => {
      load()
    }, [])
  );

  /* =========================
     FILTER
  ========================= */

  const filteredPeople = useMemo(() => {
    let result = [...people];

    if (statusFilter === "active") {
      result = result.filter((p) => p.active);
    }

    if (statusFilter === "inactive") {
      result = result.filter((p) => !p.active);
    }

    if (statusFilter === "without") {
      result = result.filter(
        (p) => p.active && p.ministryIds.length === 0
      );
    }

    if (ministryFilter !== "all") {
      result = result.filter((p) =>
        p.ministryIds.includes(ministryFilter)
      );
    }

    result.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", {
        sensitivity: "base",
      })
    );

    return result;
  }, [people, statusFilter, ministryFilter]);

  /* =========================
     DROPDOWNS
  ========================= */

  function closeAllDropdowns() {
    setStatusDropdownOpen(false);
    setMinistryDropdownOpen(false);
  }

  /* =========================
     MODAL
  ========================= */

  function openManage(person: Person) {
    setSelected(person);
    setSelectedMinistries(
      person.ministries.map((m) => ({
        ministryId: m.ministryId,
        role: m.role,
      }))
    );
    setActive(person.active);
    setModalOpen(true);
  }

  function closeModal() {
    setSelected(null);
    setSelectedMinistries([]);
    setModalOpen(false);
  }

  async function handleSave() {
    if (!selected) return;

    await updatePersonMinistries(
      selected.id,
      selectedMinistries
    );

    if (active !== selected.active) {
      await togglePersonStatus(selected.id, active);
    }

    await load();
    closeModal();
  }

  function toggleMinistry(ministryId: string) {
    setSelectedMinistries((prev) =>
      prev.some((m) => m.ministryId === ministryId)
        ? prev.filter((m) => m.ministryId !== ministryId)
        : [...prev, { ministryId, role: "member" }]
    );
  }

  function updateRole(
    ministryId: string,
    role: "leader" | "member"
  ) {
    setSelectedMinistries((prev) =>
      prev.map((m) =>
        m.ministryId === ministryId ? { ...m, role } : m
      )
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Pessoas"
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />
      <ScrollView>
        {/* OVERLAY PARA FECHAR DROPDOWNS */}
        {(statusDropdownOpen || ministryDropdownOpen) && (
          <Pressable
            style={styles.dropdownOverlay}
            onPress={closeAllDropdowns}
          />
        )}

        <View style={styles.container}>
          {/* FILTER ROW */}
          <View style={styles.filtersRow}>
            {/* STATUS */}
            <View style={styles.dropdownWrapper}>
              <Pressable
                style={styles.dropdown}
                onPress={() => {
                  setStatusDropdownOpen((v) => !v);
                  setMinistryDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {statusFilter === "active"
                    ? "Ativos"
                    : statusFilter === "all"
                      ? "Todos"
                      : statusFilter === "without"
                        ? "Sem ministério"
                        : "Inativos"}
                </Text>
              </Pressable>

              {statusDropdownOpen && (
                <View style={styles.dropdownMenuLeft}>
                  {["active", "all", "without", "inactive"].map(
                    (v) => (
                      <Pressable
                        key={v}
                        onPress={() => {
                          setStatusFilter(v as StatusFilter);
                          closeAllDropdowns();
                        }}
                      >
                        <Text style={styles.dropdownItem}>
                          {v === "active"
                            ? "Ativos"
                            : v === "all"
                              ? "Todos"
                              : v === "without"
                                ? "Sem ministério"
                                : "Inativos"}
                        </Text>
                      </Pressable>
                    )
                  )}
                </View>
              )}
            </View>

            {/* MINISTRY */}
            <View style={styles.dropdownWrapper}>
              <Pressable
                style={styles.dropdown}
                onPress={() => {
                  setMinistryDropdownOpen((v) => !v);
                  setStatusDropdownOpen(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {ministryFilter === "all"
                    ? "Todos ministérios"
                    : ministries.find(
                      (m) => m.id === ministryFilter
                    )?.name}
                </Text>
              </Pressable>

              {ministryDropdownOpen && (
                <View style={styles.dropdownMenuRight}>
                  <Pressable
                    onPress={() => {
                      setMinistryFilter("all");
                      closeAllDropdowns();
                    }}
                  >
                    <Text style={styles.dropdownItem}>
                      Todos ministérios
                    </Text>
                  </Pressable>

                  {ministries.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => {
                        setMinistryFilter(m.id);
                        closeAllDropdowns();
                      }}
                    >
                      <Text style={styles.dropdownItem}>
                        {m.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* LIST */}
          {filteredPeople.length === 0 ? (
            <Text style={styles.empty}>
              Nenhuma pessoa encontrada
            </Text>
          ) : (
            filteredPeople.map((p) => (
              <View
                key={p.id}
                style={[
                  styles.card,
                  !p.active && styles.cardInactive,
                ]}
              >
                <View>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.email}>{p.email}</Text>

                  {p.ministries.length === 0 ? (
                    <Text
                      style={[
                        styles.ministries,
                        styles.noMinistry,
                      ]}
                    >
                      ⚠️ Sem ministério
                    </Text>
                  ) : (
                    <View style={styles.ministryList}>
                      {[...p.ministries]
                        .sort((a, b) => {
                          if (a.role !== b.role) {
                            return a.role === "leader" ? -1 : 1;
                          }
                          const nameA =
                            ministries.find(
                              (x) => x.id === a.ministryId
                            )?.name ?? "";
                          const nameB =
                            ministries.find(
                              (x) => x.id === b.ministryId
                            )?.name ?? "";

                          return nameA.localeCompare(
                            nameB,
                            "pt-BR",
                            { sensitivity: "base" }
                          );
                        })
                        .map((m) => {
                          const ministry = ministries.find(
                            (x) => x.id === m.ministryId
                          );
                          if (!ministry) return null;

                          return (
                            <Text
                              key={m.ministryId}
                              style={styles.ministryItem}
                            >
                              {ministry.name} —{" "}
                              <Text
                                style={
                                  m.role === "leader"
                                    ? styles.roleLeader
                                    : styles.roleMember
                                }
                              >
                                {m.role === "leader"
                                  ? "Líder ⭐"
                                  : "Membro"}
                              </Text>
                            </Text>
                          );
                        })}
                    </View>
                  )}
                </View>

                <Pressable
                  style={styles.manage}
                  onPress={() => openManage(p)}
                >
                  <Text style={styles.manageText}>
                    Gerenciar
                  </Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
        <PersonManageModal
          visible={modalOpen}
          person={selected}
          ministries={ministries}
          onClose={closeModal}
          onSaved={load} />
      </ScrollView>
    </AppScreen>
  );
}

/* =========================
   COMPONENTS
========================= */

function RoleBtn({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.roleBtn,
        active && styles.roleActive,
      ]}
    >
      <Text
        style={[
          styles.roleText,
          active && styles.roleTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

  filtersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  dropdownWrapper: { position: "relative", zIndex: 20 },

  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },

  dropdown: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  dropdownText: { fontWeight: "700" },

  dropdownMenuLeft: {
    position: "absolute",
    top: 42,
    left: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 180,
    zIndex: 30,
  },

  dropdownMenuRight: {
    position: "absolute",
    top: 42,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 200,
    zIndex: 30,
  },

  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontWeight: "600",
  },

  empty: { textAlign: "center", marginTop: 40 },

  card: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cardInactive: {
    opacity: 0.45,
  },

  name: { fontWeight: "800" },
  email: { fontSize: 13, color: "#6B7280" },

  ministries: { marginTop: 6 },
  noMinistry: { color: "#DC2626", fontWeight: "700" },

  manage: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 12,
    justifyContent: "center",
  },

  manageText: { color: "#fff", fontWeight: "800" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },

  modal: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
  },

  modalName: { fontSize: 18, fontWeight: "800" },

  modalEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },

  statusPill: {
    padding: 8,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 12,
  },

  active: { backgroundColor: "#DCFCE7" },
  inactive: { backgroundColor: "#FEE2E2" },

  statusText: { fontWeight: "700" },

  sectionTitle: { fontWeight: "700", marginBottom: 8 },

  ministryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },

  belongsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },

  belongsBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  belongsIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  ministryName: { flex: 1, fontWeight: "700" },

  roleSwitch: { flexDirection: "row", gap: 6 },

  roleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },

  roleActive: { backgroundColor: "#2563EB" },

  roleText: { fontSize: 12, fontWeight: "700" },

  roleTextActive: { color: "#fff" },

  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },

  cancel: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },

  save: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },

  saveText: { color: "#fff", fontWeight: "800" },

  ministryList: {
    marginTop: 6,
    gap: 2,
  },

  ministryItem: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  roleLeader: {
    color: "#2563EB",
    fontWeight: "800",
  },

  roleMember: {
    color: "#6B7280",
    fontWeight: "700",
  },
});
