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

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================
   TYPES
========================= */

type StatusFilter = "all" | "without" | "inactive";

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
    useState<StatusFilter>("all");
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
     DROPDOWN HELPERS
  ========================= */

  function toggleStatusDropdown() {
    setStatusDropdownOpen((prev) => {
      if (!prev) setMinistryDropdownOpen(false);
      return !prev;
    });
  }

  function toggleMinistryDropdown() {
    setMinistryDropdownOpen((prev) => {
      if (!prev) setStatusDropdownOpen(false);
      return !prev;
    });
  }

  function closeAllDropdowns() {
    setStatusDropdownOpen(false);
    setMinistryDropdownOpen(false);
  }

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    (async () => {
      const [p, m] = await Promise.all([
        listPeople(),
        listMinistries(),
      ]);

      setPeople(p);
      setMinistries(m.filter((x) => x.active));
    })();
  }, []);

  /* =========================
     FILTER
  ========================= */

  const filteredPeople = useMemo(() => {
    let result = [...people];

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

    return result;
  }, [people, statusFilter, ministryFilter]);

  /* =========================
     MODAL
  ========================= */

  function openManage(person: Person) {
    setSelected(person);
    setSelectedMinistries(
      person.ministryIds.map((id) => ({
        ministryId: id,
        role: "member",
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

    const updated = await listPeople();
    setPeople(updated);
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
          {/* STATUS DROPDOWN */}
          <View style={styles.dropdownWrapper}>
            <Pressable
              style={styles.dropdown}
              onPress={toggleStatusDropdown}
            >
              <Text style={styles.dropdownText}>
                {statusFilter === "all"
                  ? "Todas"
                  : statusFilter === "without"
                  ? "Sem ministério"
                  : "Inativas"}
              </Text>
            </Pressable>

            {statusDropdownOpen && (
              <View style={styles.dropdownMenuLeft}>
                <DropdownItem
                  label="Todas"
                  onPress={() => {
                    setStatusFilter("all");
                    closeAllDropdowns();
                  }}
                />
                <DropdownItem
                  label="Sem ministério"
                  onPress={() => {
                    setStatusFilter("without");
                    closeAllDropdowns();
                  }}
                />
                <DropdownItem
                  label="Inativas"
                  onPress={() => {
                    setStatusFilter("inactive");
                    closeAllDropdowns();
                  }}
                />
              </View>
            )}
          </View>

          {/* MINISTRY DROPDOWN */}
          <View style={styles.dropdownWrapper}>
            <Pressable
              style={styles.dropdown}
              onPress={toggleMinistryDropdown}
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
                <DropdownItem
                  label="Todos ministérios"
                  onPress={() => {
                    setMinistryFilter("all");
                    closeAllDropdowns();
                  }}
                />
                {ministries.map((m) => (
                  <DropdownItem
                    key={m.id}
                    label={m.name}
                    onPress={() => {
                      setMinistryFilter(m.id);
                      closeAllDropdowns();
                    }}
                  />
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
            <View key={p.id} style={styles.card}>
              <View>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.email}>{p.email}</Text>

                <Text
                  style={[
                    styles.ministries,
                    p.ministryIds.length === 0 &&
                      styles.noMinistry,
                  ]}
                >
                  {p.ministryIds.length === 0
                    ? "⚠️ Sem ministério"
                    : `Ministérios: ${p.ministryIds.length}`}
                </Text>
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

      {/* MODAL */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalName}>
              {selected?.name}
            </Text>
            <Text style={styles.modalEmail}>
              {selected?.email}
            </Text>

            <Pressable
              style={[
                styles.statusPill,
                active ? styles.active : styles.inactive,
              ]}
              onPress={() => setActive((a) => !a)}
            >
              <Text style={styles.statusText}>
                {active ? "Ativa" : "Inativa"}
              </Text>
            </Pressable>

            <Text style={styles.sectionTitle}>
              Ministérios
            </Text>

            {ministries.map((m) => {
              const entry = selectedMinistries.find(
                (x) => x.ministryId === m.id
              );

              const belongs = !!entry;

              return (
                <View key={m.id} style={styles.ministryRow}>
                  <Pressable
                    style={[
                      styles.belongsBtn,
                      belongs && styles.belongsBtnActive,
                    ]}
                    onPress={() => toggleMinistry(m.id)}
                  >
                    <Text
                      style={[
                        styles.belongsIcon,
                        !belongs && { color: "#111827" },
                      ]}
                    >
                      {belongs ? "✓" : "+"}
                    </Text>
                  </Pressable>

                  <Text style={styles.ministryName}>
                    {m.name}
                  </Text>

                  {belongs && (
                    <View style={styles.roleSwitch}>
                      <RoleBtn
                        label="Membro"
                        active={entry.role === "member"}
                        onPress={() =>
                          updateRole(m.id, "member")
                        }
                      />
                      <RoleBtn
                        label="Líder"
                        active={entry.role === "leader"}
                        onPress={() =>
                          updateRole(m.id, "leader")
                        }
                      />
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.footer}>
              <Pressable
                style={styles.cancel}
                onPress={closeModal}
              >
                <Text>Cancelar</Text>
              </Pressable>

              <Pressable
                style={styles.save}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>
                  Salvar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

/* =========================
   COMPONENTS
========================= */

function DropdownItem({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.dropdownItem}>{label}</Text>
    </Pressable>
  );
}

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
    elevation: 6,
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
    elevation: 6,
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

  name: { fontWeight: "800" },
  email: { fontSize: 13, color: "#6B7280" },

  ministries: { marginTop: 6 },
  noMinistry: { color: "#DC2626", fontWeight: "700" },

  manage: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 12,
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
  },

  save: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },

  saveText: { color: "#fff", fontWeight: "800" },
});
