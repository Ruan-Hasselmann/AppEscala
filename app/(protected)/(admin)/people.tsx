import { setStringAsync } from "expo-clipboard";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import {
  createMembership,
  listMemberships,
  listMembershipsByPerson,
  Membership,
  MembershipRole,
  MembershipStatus,
  updateMembership,
} from "../../../src/services/memberships";
import {
  listActiveMinistries,
  Ministry,
  seedDefaultMinistries,
} from "../../../src/services/ministries";
import {
  createPerson,
  listPeople,
  Person,
  SystemRole,
  updatePerson,
} from "../../../src/services/people";

type FormMinistry = {
  ministryId: string;
  role: MembershipRole;
};

type FormState = {
  name: string;
  email: string;
  systemRole: "admin" | "leader" | "member";
  ministries: {
    ministryId: string;
    role: "member" | "leader";
  }[];
};

function uuidToken(len = 22) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function AdminPeople() {
  const { user, logout } = useAuth();
  if (!user || user.role !== "admin") return null;

  const [people, setPeople] = useState<Person[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteMembership, setInviteMembership] = useState<Membership | null>(
    null
  );

  // 🔹 UI state (não interfere na lógica)
  const [openMinistryId, setOpenMinistryId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    systemRole: "member",
    ministries: [],
  });

  async function load() {
    try {
      setLoading(true);
      const [p, m, mem] = await Promise.all([
        listPeople(),
        listActiveMinistries(),
        listMemberships(),
      ]);

      setPeople(Array.isArray(p) ? p : []);
      setMinistries(Array.isArray(m) ? m : []);
      setMemberships(Array.isArray(mem) ? mem : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingPerson(null);
    setForm({ name: "", email: "", systemRole: "member", ministries: [] });
    setModalVisible(true);
  }

  async function openEditPerson(p: Person) {
    const freshPerson = people.find((x) => x.id === p.id);
    if (!freshPerson) return;

    const personMemberships = memberships.filter(
      (m) => m.personId === p.id && m.status !== "inactive"
    );

    setEditingPerson(freshPerson);

    setForm({
      name: freshPerson.name,
      email: freshPerson.email,
      systemRole: freshPerson.role, // ✅ AGORA SEMPRE ATUAL
      ministries: personMemberships.map((m) => ({
        ministryId: m.ministryId,
        role: m.role,
      })),
    });

    setModalVisible(true);
  }

  function calculateSystemRoleFromMemberships(
    currentRole: SystemRole,
    memberships: Membership[]
  ): SystemRole {
    if (currentRole === "admin") return "admin";

    const hasLeader = memberships.some(
      (m) => m.role === "leader" && m.status === "active"
    );

    return hasLeader ? "leader" : "member";
  }

  function toggleMinistry(ministryId: string) {
    setForm((prev) => {
      const exists = prev.ministries.find((x) => x.ministryId === ministryId);
      if (exists) {
        return {
          ...prev,
          ministries: prev.ministries.filter((x) => x.ministryId !== ministryId),
        };
      }
      return {
        ...prev,
        ministries: [...prev.ministries, { ministryId, role: "member" }],
      };
    });
  }

  function setMinistryRole(ministryId: string, role: MembershipRole) {
    setForm((prev) => ({
      ...prev,
      ministries: prev.ministries.map((x) =>
        x.ministryId === ministryId ? { ...x, role } : x
      ),
    }));
  }


  async function save() {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!name || !email) {
      Alert.alert("Erro", "Preencha nome e email");
      return;
    }

    try {
      if (editingPerson) {
        // 1️⃣ Atualiza dados básicos
        await updatePerson(editingPerson.id, {
          name,
          email,
        });

        // 2️⃣ Busca memberships atuais DO FIRESTORE
        const current = await listMembershipsByPerson(editingPerson.id);

        // 3️⃣ CRIA / ATUALIZA MR
        for (const fm of form.ministries) {
          const existing = current.find(m => m.ministryId === fm.ministryId);

          if (!existing) {
            await createMembership({
              personId: editingPerson.id,
              ministryId: fm.ministryId,
              role: fm.role,
              status: "active",
              inviteToken: "",
            });
          } else {
            await updateMembership(existing.id, {
              role: fm.role, // 🔥 AGORA SALVA CORRETAMENTE
              status: "active",
            });
          }
        }

        // 4️⃣ DESATIVA OS REMOVIDOS
        for (const old of current) {
          const stillExists = form.ministries.some(
            fm => fm.ministryId === old.ministryId
          );

          if (!stillExists && old.status !== "inactive") {
            await updateMembership(old.id, { status: "inactive" });
          }
        }

        // 🔄 4️⃣ Recarrega memberships reais
        await load();
        const updatedMemberships = await listMembershipsByPerson(editingPerson.id);

        // 🧠 5️⃣ NORMALIZAÇÃO CENTRAL (ÚNICA)
        let finalSystemRole: SystemRole = form.systemRole;

        // ADMIN É IMUNE
        if (form.systemRole !== "admin") {
          const hasLeaderMR = updatedMemberships.some(
            (m) => m.role === "leader" && m.status === "active"
          );

          if (form.systemRole === "member") {
            // 🔻 Member nunca pode liderar ministério
            for (const m of updatedMemberships) {
              if (m.role === "leader") {
                await updateMembership(m.id, { role: "member" });
              }
            }
            finalSystemRole = "member";
          } else {
            // leader se existir ao menos um MR leader
            finalSystemRole = hasLeaderMR ? "leader" : "member";
          }
        }

        // 6️⃣ Salva role final no sistema
        let finalRole: SystemRole;

        // 🔒 Se admin foi alterado manualmente
        if (editingPerson.role === "admin" && form.systemRole !== "admin") {
          finalRole = form.systemRole; // decisão soberana
        } else if (form.systemRole === "member"){
          finalRole = "member";
        } else {
          finalRole = calculateSystemRoleFromMemberships(
            form.systemRole,
            updatedMemberships
          );
        }

        await updatePerson(editingPerson.id, { role: finalRole });

        setModalVisible(false);
        await load();
        Alert.alert("Sucesso", "Pessoa atualizada");
        return;
      }

      // CREATE
      const personId = await createPerson({
        name,
        email,
        role: form.systemRole,
      });

      for (const m of form.ministries) {
        await createMembership({
          personId,
          ministryId: m.ministryId,
          role: m.role,
          status: "invited",
          inviteToken: uuidToken(),
        });
      }

      setModalVisible(false);
      await load();
      Alert.alert("Sucesso", "Pessoa cadastrada");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao salvar");
    }
  }

  function ministryNameById(id: string) {
    return ministries.find((m) => m.id === id)?.name ?? id;
  }

  function personById(id: string) {
    return people.find((p) => p.id === id);
  }

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
    const url = buildInviteLink(inviteMembership);
    await setStringAsync(url);
    Alert.alert("Copiado", "Link copiado para a área de transferência.");
  }

  async function sendWhatsApp() {
    if (!inviteMembership) return;
    const person = personById(inviteMembership.personId);
    const url = buildInviteLink(inviteMembership);

    const text =
      `Olá${person?.name ? `, ${person.name}` : ""}! ` +
      `Aqui está seu link para ativar sua conta no App de Escalas:\n\n${url}`;

    await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  }

  const grouped = useMemo(() => {
    const byMin: Record<string, Membership[]> = {};

    for (const mem of memberships) {
      byMin[mem.ministryId] = byMin[mem.ministryId] ?? [];
      byMin[mem.ministryId].push(mem);
    }

    const groups = Object.entries(byMin).map(([ministryId, list]) => {
      const sorted = [...list].sort((a, b) => {
        const pa = personById(a.personId)?.name ?? "";
        const pb = personById(b.personId)?.name ?? "";
        return pa.localeCompare(pb);
      });

      return {
        ministryId,
        title: ministryNameById(ministryId),
        memberships: sorted,
      };
    });

    groups.sort((a, b) => a.title.localeCompare(b.title));
    return groups;
  }, [memberships, people, ministries]);

  async function toggleStatus(mem: Membership) {
    const next: MembershipStatus = mem.status === "active" ? "inactive" : "active";
    await updateMembership(mem.id, { status: next });
    await load();
  }

  async function toggleRole(mem: Membership) {
    const next: MembershipRole = mem.role === "member" ? "leader" : "member";
    await updateMembership(mem.id, { role: next });
    await load();
  }

  async function handleSeedMinistries() {
    try {
      await seedDefaultMinistries();
      await load();
      Alert.alert("OK", "Ministérios padrão criados/atualizados.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao criar ministérios.");
    }
  }

  // Se não tiver nada ainda, não quebra: mostra tela vazia
  if (loading)
    return (
      <View style={styles.container}>
        <Text>Carregando…</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* HEADER MOBILE */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pessoas</Text>
          <Text style={styles.subtitle}>Gerencie vínculos por ministério</Text>
        </View>

        <TouchableOpacity style={styles.seedPill} onPress={handleSeedMinistries}>
          <Text style={styles.seedPillText}>Seed</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
        {grouped.map((g) => {
          const isOpen = openMinistryId === g.ministryId;

          return (
            <View key={g.ministryId} style={styles.groupBlock}>
              <Pressable
                style={styles.ministryHeader}
                onPress={() =>
                  setOpenMinistryId(isOpen ? null : g.ministryId)
                }
              >
                <Text style={styles.ministryTitle}>
                  {isOpen ? "▼" : "▶"} {g.title}
                </Text>
                <View style={styles.countPill}>
                  <Text style={styles.countText}>{g.memberships.length}</Text>
                </View>
              </Pressable>

              {isOpen &&
                g.memberships.map((mem) => {
                  const person = personById(mem.personId);
                  if (!person) return null;

                  return (
                    <View key={mem.id} style={styles.card}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{person.name}</Text>
                        <Text style={styles.cardSub}>{person.email}</Text>

                        <View style={styles.badgesRow}>
                          <View style={[styles.badge, styles.badgeRole]}>
                            <Text style={styles.badgeText}>
                              {mem.role === "leader" ? "Líder" : "Membro"}
                            </Text>
                          </View>

                          {mem.status === "invited" && (
                            <View style={[styles.badge, styles.badgeInvite]}>
                              <Text style={styles.badgeText}>Convidado</Text>
                            </View>
                          )}

                          {mem.status === "active" && (
                            <View style={[styles.badge, styles.badgeOk]}>
                              <Text style={styles.badgeText}>Ativo</Text>
                            </View>
                          )}

                          {mem.status === "inactive" && (
                            <View style={[styles.badge, styles.badgeBad]}>
                              <Text style={styles.badgeText}>Inativo</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* AÇÕES COMPACTAS (ícones) */}
                      <View style={styles.actionsCol}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEditPerson(person)}
                        >
                          <Text style={styles.icon}>✏️</Text>
                        </TouchableOpacity>

                        {mem.status === "invited" && (
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => openInvite(mem)}
                          >
                            <Text style={styles.icon}>🔗</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => toggleStatus(mem)}
                        >
                          <Text style={styles.icon}>
                            {mem.status === "active" ? "⛔" : "✅"}
                          </Text>
                        </TouchableOpacity>
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
              {editingPerson ? "Editar pessoa (global)" : "Cadastrar pessoa"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome"
              placeholderTextColor="#6B7280"
              value={form.name}
              onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
            />

            {/* ✅ systemRole também no editar (você pediu escalável) */}
            <Text style={styles.sectionTitle}>Permissão no sistema</Text>
            <View style={styles.row}>
              {(["member", "leader", "admin"] as const).map((r) => (
                <Pressable
                  key={r}
                  style={[styles.roleBtn, form.systemRole === r && styles.roleActive]}
                  onPress={() => setForm((p) => ({ ...p, systemRole: r }))}
                >
                  <Text
                    style={[
                      styles.roleText,
                      form.systemRole === r && { color: "#FFFFFF" },
                    ]}
                  >
                    {r.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Ministérios (vínculo por ministério)</Text>

            <ScrollView style={{ maxHeight: 260 }}>
              {ministries.map((m) => {
                const selected = form.ministries.find((x) => x.ministryId === m.id);

                return (
                  <Pressable
                    key={m.id}
                    style={[styles.ministry, selected && styles.ministryActive]}
                    onPress={() => toggleMinistry(m.id)}
                  >
                    <Text style={[styles.ministryText, selected && { color: "#FFFFFF" }]}>
                      {m.name}
                    </Text>

                    {selected && (
                      <View style={styles.roleSwitchRow}>
                        {(["member", "leader"] as const).map((r) => (
                          <Pressable
                            key={r}
                            style={[
                              styles.roleMini,
                              selected.role === r && styles.roleMiniActive,
                            ]}
                            onPress={() => setMinistryRole(m.id, r)}
                          >
                            <Text
                              style={[
                                styles.roleMiniText,
                                selected.role === r && { color: "#FFFFFF" },
                              ]}
                            >
                              {r === "leader" ? "Líder" : "Membro"}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Salvar</Text>
            </Pressable>

            <Pressable
              style={styles.cancel}
              onPress={() => setModalVisible(false)}
            >
              <Text>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* MODAL CONVITE */}
      <Modal visible={inviteVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Convidar</Text>

            {inviteMembership && (
              <>
                <View style={styles.inviteBox}>
                  <Text style={styles.inviteText}>
                    {buildInviteLink(inviteMembership)}
                  </Text>
                </View>

                <Pressable style={styles.save} onPress={copyInvite}>
                  <Text style={styles.saveText}>Copiar link</Text>
                </Pressable>

                <Pressable
                  style={[styles.save, { marginTop: 8 }]}
                  onPress={sendWhatsApp}
                >
                  <Text style={styles.saveText}>Enviar WhatsApp</Text>
                </Pressable>
              </>
            )}

            <Pressable
              style={styles.cancel}
              onPress={() => setInviteVisible(false)}
            >
              <Text>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#FFFFFF" },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#6B7280", marginTop: 2 },

  // Botão seed compacto
  seedPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  seedPillText: { fontWeight: "900", color: "#111827" },

  // FAB de cadastro
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#FFFFFF", fontWeight: "900", fontSize: 22, marginTop: -1 },

  topActions: { flexDirection: "row", gap: 8, marginBottom: 12 },

  primary: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" },

  secondary: {
    width: 140,
    backgroundColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  secondaryText: { color: "#111827", fontWeight: "800", textAlign: "center" },

  groupBlock: { marginBottom: 10 },

  ministryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 10,
  },

  ministryTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  countPill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  countText: { fontWeight: "900", color: "#111827", fontSize: 12 },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  cardTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  cardSub: { fontSize: 13, color: "#374151", marginTop: 2 },

  badgesRow: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#111827" },

  badgeRole: { backgroundColor: "#E0E7FF" },
  badgeInvite: { backgroundColor: "#DBEAFE" },
  badgeOk: { backgroundColor: "#D1FAE5" },
  badgeBad: { backgroundColor: "#FEE2E2" },

  // ações em coluna (mobile)
  actionsCol: {
    width: 44,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  iconBtn: {
    width: 38,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  icon: { fontSize: 16 },

  cardActionsRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  actionBtn: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionText: { fontSize: 12, fontWeight: "700", color: "#111827" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "94%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    maxHeight: "90%",
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
    color: "#111827",
  },

  sectionTitle: { fontWeight: "800", marginBottom: 8, marginTop: 8 },

  ministry: { padding: 12, borderRadius: 12, backgroundColor: "#E5E7EB", marginBottom: 8 },
  ministryActive: { backgroundColor: "#2563EB" },
  ministryText: { fontWeight: "800", color: "#111827" },

  roleSwitchRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  roleMini: { backgroundColor: "#CBD5E1", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  roleMiniActive: { backgroundColor: "#1E3A8A" },
  roleMiniText: { fontSize: 11, fontWeight: "800", color: "#111827" },

  save: { backgroundColor: "#065F46", paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  saveText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },

  cancel: { marginTop: 12, alignItems: "center" },

  inviteBox: { backgroundColor: "#F3F4F6", borderRadius: 12, padding: 10, marginBottom: 10 },
  inviteText: { color: "#111827" },

  logout: { marginTop: 16, backgroundColor: "#991B1B", paddingVertical: 14, borderRadius: 12 },
  logoutText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },

  row: { flexDirection: "row", gap: 8, marginBottom: 12 },

  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },

  roleActive: { backgroundColor: "#1E3A8A" },

  roleText: { fontWeight: "800", color: "#111827" },
});
