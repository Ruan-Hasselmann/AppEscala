import { setStringAsync } from "expo-clipboard";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ConfirmModal from "@/src/components/ConfirmModal";
import AdminMinistriesModal from "@/src/components/ModalMinistries";
import { useAuth } from "../../../src/contexts/AuthContext";
import {
  createMembership,
  listMemberships,
  listMembershipsByPerson,
  Membership,
  MembershipRole,
  updateMembership,
} from "../../../src/services/memberships";
import {
  listAllMinistries,
  Ministry,
} from "../../../src/services/ministries";
import {
  createPerson,
  listPeople,
  Person,
  SystemRole,
  updatePerson,
} from "../../../src/services/people";

/* =========================
   TYPES
========================= */

type FormState = {
  name: string;
  email: string;
  systemRole: SystemRole;
  ministries: {
    ministryId: string;
    role: MembershipRole;
  }[];
};

/* =========================
   UTILS
========================= */

function uuidToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* =========================
   COMPONENT
========================= */

export default function AdminPeople() {
  const { logout } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMinistryId, setOpenMinistryId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteMembership, setInviteMembership] =
    useState<Membership | null>(null);

  const [ministryModalOpen, setMinistryModalOpen] = useState(false);

  const [confirm, setConfirm] = useState<{
    title: string;
    message?: string;
    onConfirm?: () => Promise<void> | void;
  } | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    systemRole: "member",
    ministries: [],
  });

  /* =========================
     LOAD
  ========================= */

  async function load() {
    setLoading(true);
    const [p, m, mem] = await Promise.all([
      listPeople(),
      listAllMinistries(),
      listMemberships(),
    ]);

    setPeople(p ?? []);
    setMinistries(m ?? []);
    setMemberships(mem ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* =========================
     DERIVED
  ========================= */

  const sortedMinistries = useMemo(() => {
    return ministries
      .filter((m) => m.active !== false) // 👈 ignora desativados
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      );
  }, [ministries]);

  async function toggleMembershipStatus(mem: Membership) {
    const nextStatus =
      mem.status === "active" ? "inactive" : "active";

    await updateMembership(mem.id, { status: nextStatus });
    await load();
  }

  const groupedByMinistry = useMemo(() => {
    const map: Record<
      string,
      { ministry: Ministry; memberships: Membership[] }
    > = {};

    for (const mem of memberships) {
      const ministry = ministries.find((m) => m.id === mem.ministryId);
      if (!ministry) continue;

      if (!map[ministry.id]) {
        map[ministry.id] = { ministry, memberships: [] };
      }

      map[ministry.id].memberships.push(mem);
    }

    return Object.values(map).sort((a, b) =>
      a.ministry.name.localeCompare(b.ministry.name, "pt-BR")
    );
  }, [memberships, ministries]);

  /* =========================
     FORM HELPERS
  ========================= */

  function openCreate() {
    setEditingPerson(null);
    setForm({
      name: "",
      email: "",
      systemRole: "member",
      ministries: [],
    });
    setModalVisible(true);
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function openEditPerson(p: Person) {
    const personMemberships = memberships.filter(
      (m) => m.personId === p.id && m.status !== "inactive"
    );

    setEditingPerson(p);
    setForm({
      name: p.name,
      email: p.email,
      systemRole: p.role,
      ministries: personMemberships.map((m) => ({
        ministryId: m.ministryId,
        role: m.role,
      })),
    });

    setModalVisible(true);
  }

  function closeFormModal() {
    setModalVisible(false);
    setEditingPerson(null);
  }

  function toggleMinistry(ministryId: string) {
    setForm((prev) => {
      const exists = prev.ministries.find(
        (m) => m.ministryId === ministryId
      );

      if (exists) {
        return {
          ...prev,
          ministries: prev.ministries.filter(
            (m) => m.ministryId !== ministryId
          ),
        };
      }

      return {
        ...prev,
        ministries: [
          ...prev.ministries,
          { ministryId, role: "member" },
        ],
      };
    });
  }

  function setMinistryRole(ministryId: string, role: MembershipRole) {
    setForm((prev) => ({
      ...prev,
      ministries: prev.ministries.map((m) =>
        m.ministryId === ministryId ? { ...m, role } : m
      ),
    }));
  }

  /* =========================
     SAVE
  ========================= */

  async function save() {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      setConfirm({ title: "Erro", message: "Preencha nome e email" });
      return;
    }

    if (!isValidEmail(email)) {
      setConfirm({
        title: "Email inválido",
        message: "Informe um endereço de email válido.",
      });
      return;
    }

    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, {
          name,
          email,
          role: form.systemRole,
        });

        const current = await listMembershipsByPerson(editingPerson.id);

        for (const fm of form.ministries) {
          const existing = current.find(
            (m) => m.ministryId === fm.ministryId
          );

          const ministryName =
            ministries.find((x) => x.id === fm.ministryId)?.name ?? "";

          if (!existing) {
            await createMembership({
              personId: editingPerson.id,
              ministryId: fm.ministryId,
              role: fm.role,
              status: "active",
              inviteToken: "",
              personName: name,
              personEmail: email,
              ministryName,
            });
          } else {
            await updateMembership(existing.id, {
              role: fm.role,
              status: "active",
              personName: name,
              personEmail: email,
              ministryName,
            });
          }
        }

        for (const old of current) {
          const stillExists = form.ministries.some(
            (fm) => fm.ministryId === old.ministryId
          );
          if (!stillExists && old.status !== "inactive") {
            await updateMembership(old.id, { status: "inactive" });
          }
        }

        setConfirm({ title: "Sucesso", message: "Pessoa atualizada" });
      } else {
        const personId = await createPerson({
          name,
          email,
          role: form.systemRole,
        });

        for (const m of form.ministries) {
          const ministryName =
            ministries.find((x) => x.id === m.ministryId)?.name ?? "";

          await createMembership({
            personId,
            ministryId: m.ministryId,
            role: m.role,
            status: "invited",
            inviteToken: uuidToken(),
            personName: name,
            personEmail: email,
            ministryName,
          });
        }

        setConfirm({ title: "Sucesso", message: "Pessoa cadastrada" });
      }

      closeFormModal();
      await load();
    } catch (e: any) {
      setConfirm({
        title: "Erro",
        message: e?.message ?? "Falha ao salvar",
      });
    }
  }

  /* =========================
     INVITE
  ========================= */

  function buildInviteLink(mem: Membership) {
    return Linking.createURL("/register", {
      queryParams: {
        membershipId: mem.id,
        token: mem.inviteToken ?? "",
      },
    });
  }

  async function openInvite(mem: Membership) {
    setInviteMembership(mem);
    setInviteVisible(true);
  }

  async function copyInvite() {
    if (!inviteMembership) return;
    await setStringAsync(buildInviteLink(inviteMembership));
    //setConfirm({ title: "Copiado", message: "Link copiado." });
    setInviteVisible(false);
  }

  async function sendWhatsApp() {
    if (!inviteMembership) return;
    const url = buildInviteLink(inviteMembership);

    await Linking.openURL(
      `https://wa.me/?text=${encodeURIComponent(
        `Aqui está seu link para ativar sua conta:\n\n${url}`
      )}`
    );
  }

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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pessoas</Text>
          <Text style={styles.subtitle}>Gerencie pessoas e vínculos</Text>
        </View>

        <TouchableOpacity
          style={styles.seedPill}
          onPress={() => setMinistryModalOpen(true)}
        >
          <Text style={styles.seedPillText}>Ministérios</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* LISTAGEM */}
      <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
        {groupedByMinistry.map((group) => {
          const isOpen = openMinistryId === group.ministry.id;

          return (
            <View key={group.ministry.id} style={styles.groupBlock}>
              <Pressable
                style={styles.ministryHeader}
                onPress={() =>
                  setOpenMinistryId(
                    isOpen ? null : group.ministry.id
                  )
                }
              >
                <Text style={styles.ministryTitle}>
                  {isOpen ? "▼" : "▶"} {group.ministry.name}
                </Text>

                <View style={styles.countPill}>
                  <Text style={styles.countText}>
                    {group.memberships.length}
                  </Text>
                </View>
              </Pressable>

              {isOpen &&
                group.memberships.map((mem) => {
                  const person = people.find(
                    (p) => p.id === mem.personId
                  );
                  if (!person) return null;

                  return (
                    <View key={mem.id} style={[styles.card, mem.status === "inactive" && { opacity: 0.5 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>
                          {person.name}
                        </Text>
                        <Text style={styles.cardSub}>
                          {person.email}
                        </Text>

                        <View style={styles.badgesRow}>
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {mem.role === "leader"
                                ? "Líder"
                                : "Membro"}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.badge,
                              mem.status === "active" &&
                              styles.badgeOk,
                              mem.status === "invited" &&
                              styles.badgeInvite,
                              mem.status === "inactive" &&
                              styles.badgeBad,
                            ]}
                          >
                            <Text style={styles.badgeText}>
                              {mem.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.actionsCol}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEditPerson(person)}
                        >
                          <Text>✏️</Text>
                        </TouchableOpacity>

                        {mem.status === "invited" && (
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openInvite(mem)}
                          >
                            <Text>🔗</Text>
                          </TouchableOpacity>
                        )}

                        {mem.status !== "invited" && (
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => toggleMembershipStatus(mem)}
                          >
                            <Text>
                              {mem.status === "active" ? "⛔" : "✅"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL CREATE / EDIT */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingPerson ? "Editar pessoa" : "Cadastrar pessoa"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome"
              value={form.name}
              onChangeText={(t) =>
                setForm((p) => ({ ...p, name: t }))
              }
            />

            <TextInput
              style={[
                styles.input,
                form.email && !isValidEmail(form.email) && {
                  borderColor: "#DC2626",
                },
              ]}
              placeholder="Email"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(t) =>
                setForm((p) => ({ ...p, email: t }))
              }
            />

            {/* SYSTEM ROLE */}
            <Text style={styles.sectionTitle}>Permissão no sistema</Text>
            <View style={styles.roleRow}>
              {(["member", "leader", "admin"] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[
                    styles.roleBtn,
                    form.systemRole === r && styles.roleActive,
                  ]}
                  onPress={() =>
                    setForm((p) => ({ ...p, systemRole: r }))
                  }
                >
                  <Text
                    style={[
                      styles.roleText,
                      form.systemRole === r && {
                        color: "#FFFFFF",
                      },
                    ]}
                  >
                    {r.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* MINISTRIES */}
            <Text style={styles.sectionTitle}>Ministérios</Text>

            <ScrollView style={{ maxHeight: 260 }}>
              {sortedMinistries.map((m) => {
                const selected = form.ministries.find(
                  (x) => x.ministryId === m.id
                );

                return (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.ministryItem,
                      selected && styles.ministryActive,
                    ]}
                    onPress={() => toggleMinistry(m.id)}
                  >
                    <Text
                      style={[
                        styles.ministryText,
                        selected && { color: "#FFFFFF" },
                      ]}
                    >
                      {m.name}
                    </Text>

                    {selected && (
                      <View style={styles.roleMiniRow}>
                        {(["member", "leader"] as const).map((r) => (
                          <Pressable
                            key={r}
                            style={[
                              styles.roleMini,
                              selected.role === r &&
                              styles.roleMiniActive,
                            ]}
                            onPress={() =>
                              setMinistryRole(m.id, r)
                            }
                          >
                            <Text
                              style={[
                                styles.roleMiniText,
                                selected.role === r && {
                                  color: "#FFFFFF",
                                },
                              ]}
                            >
                              {r === "leader"
                                ? "Líder"
                                : "Membro"}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancel}
              onPress={closeFormModal}
            >
              <Text>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL INVITE */}
      <Modal visible={inviteVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Convite</Text>

            {inviteMembership && (
              <>
                <View style={styles.inviteBox}>
                  <Text selectable>
                    {buildInviteLink(inviteMembership)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.save}
                  onPress={copyInvite}
                >
                  <Text style={styles.saveText}>Copiar link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.save, { marginTop: 8 }]}
                  onPress={sendWhatsApp}
                >
                  <Text style={styles.saveText}>
                    Enviar WhatsApp
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.cancel}
              onPress={() => setInviteVisible(false)}
            >
              <Text>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AdminMinistriesModal
        visible={ministryModalOpen}
        onClose={() => setMinistryModalOpen(false)}
        ministries={ministries}
        onReload={load}
      />

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message}
        onConfirm={async () => {
          await confirm?.onConfirm?.();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FFFFFF" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6B7280" },

  seedPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  seedPillText: { fontWeight: "900", color: "#111827" },

  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#FFFFFF", fontWeight: "900", fontSize: 22 },

  groupBlock: { marginBottom: 10 },
  ministryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  ministryTitle: { fontSize: 16, fontWeight: "900" },

  countPill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontWeight: "900", fontSize: 12 },

  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  cardTitle: { fontWeight: "800" },
  cardSub: { color: "#374151", marginTop: 2 },

  badgesRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  badge: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
  badgeOk: { backgroundColor: "#D1FAE5" },
  badgeInvite: { backgroundColor: "#DBEAFE" },
  badgeBad: { backgroundColor: "#FEE2E2" },

  actionsCol: { width: 44, alignItems: "center", gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "92%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },

  sectionTitle: { fontWeight: "800", marginBottom: 8 },

  roleRow: { flexDirection: "row", gap: 6, marginBottom: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  roleActive: { backgroundColor: "#1E3A8A" },
  roleText: { fontWeight: "800", color: "#111827" },

  ministryItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  ministryActive: { backgroundColor: "#2563EB" },
  ministryText: { fontWeight: "800" },

  roleMiniRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  roleMini: {
    backgroundColor: "#CBD5E1",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  roleMiniActive: { backgroundColor: "#1E3A8A" },
  roleMiniText: { fontSize: 11, fontWeight: "800" },

  inviteBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },

  save: {
    backgroundColor: "#065F46",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  saveText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },

  cancel: { marginTop: 12, alignItems: "center" },

  logout: {
    marginTop: 16,
    backgroundColor: "#991B1B",
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },
});
