import { setStringAsync } from "expo-clipboard";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import {
  createMembership,
  listMemberships,
  listMembershipsByPerson,
  Membership,
  MembershipRole,
  updateMembership
} from "../../../src/services/memberships";
import {
  listAllMinistries,
  Ministry
} from "../../../src/services/ministries";
import {
  createPerson,
  listPeople,
  Person,
  SystemRole,
  updatePerson,
} from "../../../src/services/people";
import ConfirmModal from "./components/ConfirmModal";
import AdminMinistriesModal from "./components/ModalMinistries";

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
  const [refreshing, setRefreshing] = useState(false);

  const [ministryModalOpen, setMinistryModalOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteMembership, setInviteMembership] =
    useState<Membership | null>(null);

  const [confirm, setConfirm] = useState<{
    title: string;
    message?: string;
    onConfirm?: () => Promise<void> | void;
  } | null>(null);

  const [openMinistryId, setOpenMinistryId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    systemRole: "member",
    ministries: [],
  });

  const sortedMinistries = useMemo(() => {
    return [...ministries].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
  }, [ministries]);

  /* =========================
     LOAD
  ========================= */

  async function load(isFirstLoad = false) {
    try {
      if (isFirstLoad) setLoading(true);
      else setRefreshing(true);

      const [p, m, mem] = await Promise.all([
        listPeople(),
        listAllMinistries(),
        listMemberships(),
      ]);

      setPeople(p ?? []);
      setMinistries(m ?? []);
      setMemberships(mem ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function reloadAll() {
    await load();
  }

  useEffect(() => {
    load(true);
  }, []);

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

  function closeFormModal() {
    setModalVisible(false);
    setEditingPerson(null);
    setForm({
      name: "",
      email: "",
      systemRole: "member",
      ministries: [],
    });
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

    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, { name, email });

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

        await reloadAll();
        setConfirm({ title: "Sucesso", message: "Pessoa atualizada" });
        closeFormModal();
        return;
      }

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

      await reloadAll();
      setConfirm({ title: "Sucesso", message: "Pessoa cadastrada" });
      closeFormModal();
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

  async function copyInvite() {
    if (!inviteMembership) return;
    await setStringAsync(buildInviteLink(inviteMembership));
    setConfirm({ title: "Copiado", message: "Link copiado." });
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
          <Text style={styles.subtitle}>Gerencie vínculos por ministério</Text>
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
        {memberships.length === 0 && (
          <Text style={{ color: "#6B7280" }}>
            Nenhuma pessoa cadastrada ainda.
          </Text>
        )}
      </ScrollView>

      {/* MODAIS */}
      <AdminMinistriesModal
        visible={ministryModalOpen}
        onClose={() => setMinistryModalOpen(false)}
        ministries={ministries}
        onReload={reloadAll}
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

      <TouchableOpacity style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
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
  logout: {
    marginTop: 16,
    backgroundColor: "#991B1B",
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },
});
