import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Ministry } from "@/src/services/ministries";
import {
  Person,
  togglePersonStatus,
  updatePersonMinistries,
} from "@/src/services/people";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { SystemRole } from "../constants/role";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../services/firebase";

/* =========================
   TYPES
========================= */

type SelectedMinistry = {
  ministryId: string;
  role: "leader" | "member";
};

type Props = {
  visible: boolean;
  person: Person | null;
  ministries: Ministry[];

  /** 🔒 se definido, limita o modal a apenas 1 ministério (uso do líder) */
  restrictToMinistryId?: string;

  /** 🔒 se false, impede adicionar/remover ministério */
  allowRemoveMinistry?: boolean;

  onClose: () => void;
  onSaved: () => Promise<void>;
};

/* =========================
   COMPONENT
========================= */

export async function updatePersonSystemRole(
  personId: string,
  role: SystemRole
) {
  await updateDoc(doc(db, "people", personId), {
    role,
    updatedAt: serverTimestamp(),
  });
}

export function PersonManageModal({
  visible,
  person,
  ministries,
  restrictToMinistryId,
  allowRemoveMinistry = true,
  onClose,
  onSaved,
}: Props) {
  const [selectedMinistries, setSelectedMinistries] = useState<
    SelectedMinistry[]
  >([]);
  const [active, setActive] = useState(true);
  const { refreshUser } = useAuth();


  /* =========================
     SYNC STATE
  ========================= */

  useEffect(() => {
    if (!person) return;

    setSelectedMinistries(
      person.ministries.map((m) => ({
        ministryId: m.ministryId,
        role: m.role,
      }))
    );

    setActive(person.active);
  }, [person]);

  /* =========================
     DERIVED
  ========================= */

  const visibleMinistries = useMemo(() => {
    if (restrictToMinistryId) {
      return ministries.filter(
        (m) => m.id === restrictToMinistryId
      );
    }

    return ministries;
  }, [ministries, restrictToMinistryId]);

  /* =========================
     ACTIONS
  ========================= */

  function toggleMinistry(ministryId: string) {
    if (!allowRemoveMinistry) return;

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

  async function handleSave() {
    if (!person) return;

    // 1️⃣ Atualiza ministérios
    await updatePersonMinistries(
      person.id,
      selectedMinistries
    );

    // 2️⃣ Atualiza status ativo/inativo
    if (active !== person.active) {
      await togglePersonStatus(person.id, active);
    }

    // 3️⃣ 🔥 REGRA DO ROLE DO SISTEMA
    // Admin nunca muda
    if (person.role !== "admin") {
      const hasLeaderRole = selectedMinistries.some(
        (m) => m.role === "leader"
      );

      const newSystemRole = hasLeaderRole
        ? "leader"
        : "member";

      if (newSystemRole !== person.role) {
        await updatePersonSystemRole(
          person.id,
          newSystemRole
        );
      }
    }

    await onSaved();
    await refreshUser(); // 🔥 força reavaliação do role
    onClose();
  }

  if (!person) return null;

  /* =========================
     RENDER
  ========================= */

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalName}>
            {person.name}
          </Text>

          <Text style={styles.modalEmail}>
            {person.email}
          </Text>

          {/* 🔒 líder pode ou não ver isso depois — por enquanto mantido */}
          <Pressable
            style={[
              styles.statusPill,
              active ? styles.active : styles.inactive,
            ]}
            onPress={() => setActive((a) => !a)}
          >
            <Text style={styles.statusText}>
              {active ? "Ativo" : "Inativo"}
            </Text>
          </Pressable>

          <Text style={styles.sectionTitle}>
            Ministérios
          </Text>

          {visibleMinistries.map((m) => {
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
                    !allowRemoveMinistry && { opacity: 0.4 },
                  ]}
                  onPress={() => toggleMinistry(m.id)}
                >
                  <Text
                    style={[
                      styles.belongsIcon,
                      !belongs && {
                        color: "#111827",
                      },
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
              onPress={onClose}
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
  );
}

/* =========================
   SUBCOMPONENTS
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
   STYLES (inalterados)
========================= */

const styles = StyleSheet.create({
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

  modalName: {
    fontSize: 18,
    fontWeight: "800",
  },

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

  sectionTitle: {
    fontWeight: "700",
    marginBottom: 8,
  },

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

  ministryName: {
    flex: 1,
    fontWeight: "700",
  },

  roleSwitch: {
    flexDirection: "row",
    gap: 6,
  },

  roleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },

  roleActive: {
    backgroundColor: "#2563EB",
  },

  roleText: {
    fontSize: 12,
    fontWeight: "700",
  },

  roleTextActive: {
    color: "#fff",
  },

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

  saveText: {
    color: "#fff",
    fontWeight: "800",
  },
});
