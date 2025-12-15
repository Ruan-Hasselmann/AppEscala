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
  Membership,
  MembershipRole,
  MembershipStatus,
  updateMembership,
} from "../../../src/services/memberships";
import { listActiveMinistries, Ministry, seedDefaultMinistries } from "../../../src/services/ministries";
import { createPerson, listPeople, Person, updatePerson } from "../../../src/services/people";

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
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
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
  const [inviteMembership, setInviteMembership] = useState<Membership | null>(null);

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
    setEditingPerson(p);

    setForm({
      name: p.name,
      email: p.email,
      systemRole: "member",
      ministries: [],
    });

    setModalVisible(true);
  }

  function toggleMinistry(ministryId: string) {
    setForm((prev) => {
      const exists = prev.ministries.find((x) => x.ministryId === ministryId);
      if (exists) {
        return { ...prev, ministries: prev.ministries.filter((x) => x.ministryId !== ministryId) };
      }
      return { ...prev, ministries: [...prev.ministries, { ministryId, role: "member" }] };
    });
  }

  function setMinistryRole(ministryId: string, role: MembershipRole) {
    setForm((prev) => ({
      ...prev,
      ministries: prev.ministries.map((x) => (x.ministryId === ministryId ? { ...x, role } : x)),
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
        await updatePerson(editingPerson.id, {
          name: form.name,
          email: form.email,
        });

        Alert.alert("Sucesso", "Pessoa atualizada");
      }


      // CREATE person
      const personId = await createPerson({ name, email });

      // CREATE memberships (invited por padrão)
      if (form.ministries.length > 0) {
        for (const m of form.ministries) {
          await createMembership({
            personId,
            ministryId: m.ministryId,
            role: m.role,
            status: "invited",
            inviteToken: uuidToken(),
          });
        }
      }

      setModalVisible(false);
      await load();
      Alert.alert("Sucesso", "Pessoa cadastrada (e vínculos criados).");
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
    // Link leva membershipId + token (para ativação segura por rules)
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
    // Agrupa memberships por ministério, ordena por nome
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

      return { ministryId, title: ministryNameById(ministryId), memberships: sorted };
    });

    // ordena os ministérios pelo nome
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

  if (loading) return <View style={styles.container}><Text>Carregando…</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciar Pessoas</Text>

      <View style={styles.topActions}>
        <TouchableOpacity style={styles.primary} onPress={openCreate}>
          <Text style={styles.primaryText}>+ Cadastrar pessoa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={handleSeedMinistries}>
          <Text style={styles.secondaryText}>Seed ministérios</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {grouped.map((g) => (
          <View key={g.ministryId} style={styles.groupBlock}>
            <Text style={styles.ministryTitle}>{g.title}</Text>

            {g.memberships.map((mem) => {
              const person = personById(mem.personId);
              if (!person) return null;

              return (
                <View key={mem.id} style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{person.name}</Text>
                    <Text style={styles.cardSub}>{person.email}</Text>

                    <View style={styles.badgesRow}>
                      <View style={[styles.badge, styles.badgeRole]}>
                        <Text style={styles.badgeText}>{mem.role === "leader" ? "Líder" : "Membro"}</Text>
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

                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditPerson(person)}>
                      <Text style={styles.actionText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleRole(mem)}>
                      <Text style={styles.actionText}>Role</Text>
                    </TouchableOpacity>

                    {mem.status === "invited" && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => openInvite(mem)}>
                        <Text style={styles.actionText}>Convidar</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleStatus(mem)}>
                      <Text style={styles.actionText}>
                        {mem.status === "active" ? "Desativar" : "Ativar"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
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

            {!editingPerson && (
              <>
                <Text style={styles.sectionTitle}>Permissão no sistema</Text>

                <View style={styles.row}>
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
                                style={[styles.roleMini, selected.role === r && styles.roleMiniActive]}
                                onPress={() => setMinistryRole(m.id, r)}
                              >
                                <Text style={[styles.roleMiniText, selected.role === r && { color: "#FFFFFF" }]}>
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
              </>
            )}

            <Pressable style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Salvar</Text>
            </Pressable>

            <Pressable style={styles.cancel} onPress={() => setModalVisible(false)}>
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
                  <Text style={styles.inviteText}>{buildInviteLink(inviteMembership)}</Text>
                </View>

                <Pressable style={styles.save} onPress={copyInvite}>
                  <Text style={styles.saveText}>Copiar link</Text>
                </Pressable>

                <Pressable style={[styles.save, { marginTop: 8 }]} onPress={sendWhatsApp}>
                  <Text style={styles.saveText}>Enviar WhatsApp</Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.cancel} onPress={() => setInviteVisible(false)}>
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

  title: { fontSize: 22, fontWeight: "800", marginBottom: 12 },

  topActions: { flexDirection: "row", gap: 8, marginBottom: 16 },

  primary: { flex: 1, backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 12 },
  primaryText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" },

  secondary: { width: 140, backgroundColor: "#E5E7EB", paddingVertical: 14, borderRadius: 12 },
  secondaryText: { color: "#111827", fontWeight: "800", textAlign: "center" },

  groupBlock: { marginBottom: 8 },

  ministryTitle: { fontSize: 16, fontWeight: "900", color: "#111827", marginTop: 16, marginBottom: 8 },

  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
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

  cardActionsRow: { flexDirection: "row", gap: 6, alignItems: "center" },

  actionBtn: { backgroundColor: "#F3F4F6", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: "700", color: "#111827" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  modal: { width: "94%", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 18, maxHeight: "90%" },

  modalTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 12 },

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
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },

  roleActive: {
    backgroundColor: "#1E3A8A",
  },

  roleText: {
    fontWeight: "800",
    color: "#111827",
  },

});
