import * as Clipboard from "expo-clipboard";
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
    View
} from "react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import {
    listActiveMinistries,
    Ministry,
    seedDefaultMinistries,
} from "../../../src/services/ministries";
import {
    createPerson,
    CreatePersonDTO,
    listPeople,
    Person,
    updatePerson,
} from "../../../src/services/people";

type FormState = {
    name: string;
    email: string;
    role: "member" | "leader" | "admin";
    ministryIds: string[];
};

type Group = {
    id: string;
    title: string;
    people: Person[];
};

export default function AdminPeople() {
    const { user, logout } = useAuth();
    if (!user || user.role !== "admin") return null;

    const [people, setPeople] = useState<Person[]>([]);
    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [loading, setLoading] = useState(true);

    // create / edit
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Person | null>(null);

    // invite
    const [inviteVisible, setInviteVisible] = useState(false);
    const [invitePerson, setInvitePerson] = useState<Person | null>(null);

    const [form, setForm] = useState<FormState>({
        name: "",
        email: "",
        role: "member",
        ministryIds: [],
    });

    async function load() {
        try {
            setLoading(true);
            const [p, m] = await Promise.all([listPeople(), listActiveMinistries()]);
            setPeople(Array.isArray(p) ? p : []);
            setMinistries(Array.isArray(m) ? m : []);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function openCreate() {
        setEditing(null);
        setForm({ name: "", email: "", role: "member", ministryIds: [] });
        setModalVisible(true);
    }

    function openEdit(p: Person) {
        setEditing(p);
        setForm({
            name: p.name,
            email: p.email,
            role: p.role,
            ministryIds: p.ministryIds ?? [],
        });
        setModalVisible(true);
    }

    function toggleMinistry(id: string) {
        setForm((prev) => ({
            ...prev,
            ministryIds: prev.ministryIds.includes(id)
                ? prev.ministryIds.filter((m) => m !== id)
                : [...prev.ministryIds, id],
        }));
    }

    async function save() {
        if (!form.name || !form.email) {
            Alert.alert("Erro", "Preencha nome e email");
            return;
        }

        if (editing) {
            await updatePerson(editing.id, {
                ...form,
            });
        } else {
            const payload: CreatePersonDTO = {
                ...form,
                active: false,
                invited: true,
            };
            await createPerson(payload);
        }

        setModalVisible(false);
        await load();
        Alert.alert("Sucesso", "Pessoa salva");
    }

    function buildInviteLink(p: Person) {
        return Linking.createURL("/register", {
            queryParams: { personId: p.id },
        });
    }

    async function copyInvite() {
        if (!invitePerson) return;
        await Clipboard.setStringAsync(buildInviteLink(invitePerson));
        Alert.alert("Copiado", "Link copiado para a área de transferência");
    }

    async function sendWhatsApp() {
        if (!invitePerson) return;
        const url = buildInviteLink(invitePerson);
        const text = `Olá! Aqui está seu link para ativar sua conta:\n\n${url}`;
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }

    const groups: Group[] = useMemo(() => {
        const map: Record<string, Person[]> = {};

        for (const p of people) {
            const ids = p.ministryIds?.length ? p.ministryIds : ["__none__"];
            ids.forEach((id) => {
                map[id] = map[id] ?? [];
                map[id].push(p);
            });
        }

        return Object.entries(map).map(([id, list]) => ({
            id,
            title:
                id === "__none__"
                    ? "Sem ministério"
                    : ministries.find((m) => m.id === id)?.name ?? id,
            people: list.sort((a, b) => a.name.localeCompare(b.name)),
        }));
    }, [people, ministries]);

    if (loading) return <Text>Carregando…</Text>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Gerenciar Pessoas</Text>

            <View style={styles.topActions}>
                <TouchableOpacity style={styles.primary} onPress={openCreate}>
                    <Text style={styles.primaryText}>+ Cadastrar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondary} onPress={seedDefaultMinistries}>
                    <Text style={styles.secondaryText}>Criar ministérios</Text>
                </TouchableOpacity>
            </View>

            <ScrollView>
                {groups.map((group) => (
                    <View key={group.id}>
                        <Text style={styles.ministryTitle}>{group.title}</Text>

                        {group.people.map((p) => (
                            <View key={p.id} style={styles.card}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{p.name}</Text>
                                    <Text style={styles.cardSub}>{p.email}</Text>

                                    {/* STATUS */}
                                    <View style={styles.badgesRow}>
                                        {p.invited && (
                                            <View style={[styles.badge, styles.badgeInvite]}>
                                                <Text style={styles.badgeText}>Convidado</Text>
                                            </View>
                                        )}

                                        {!p.invited && p.active && (
                                            <View style={[styles.badge, styles.badgeOk]}>
                                                <Text style={styles.badgeText}>Ativo</Text>
                                            </View>
                                        )}

                                        {!p.active && (
                                            <View style={[styles.badge, styles.badgeBad]}>
                                                <Text style={styles.badgeText}>Inativo</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* AÇÕES */}
                                <View style={styles.cardActionsRow}>
                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() => openEdit(p)}
                                    >
                                        <Text style={styles.actionText}>Editar</Text>
                                    </TouchableOpacity>

                                    {p.invited && (
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => {
                                                setInvitePerson(p);
                                                setInviteVisible(true);
                                            }}
                                        >
                                            <Text style={styles.actionText}>Convidar</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={async () => {
                                            await updatePerson(p.id, { active: !p.active });
                                            await load();
                                        }}
                                    >
                                        <Text style={styles.actionText}>
                                            {p.active ? "Desativar" : "Ativar"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                    </View>
                ))}
            </ScrollView>
            {/* MODAL CREATE / EDIT */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>
                            {editing ? "Editar pessoa" : "Cadastrar pessoa"}
                        </Text>

                        {/* NOME */}
                        <Text style={styles.sectionTitle}>Nome</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Digite o nome"
                            placeholderTextColor="#6B7280"
                            value={form.name}
                            onChangeText={(t) =>
                                setForm((p) => ({ ...p, name: t }))
                            }
                        />

                        {/* EMAIL */}
                        <Text style={styles.sectionTitle}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Digite o email"
                            placeholderTextColor="#6B7280"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={form.email}
                            onChangeText={(t) =>
                                setForm((p) => ({ ...p, email: t }))
                            }
                        />

                        {/* ROLE */}
                        <Text style={styles.sectionTitle}>Permissão</Text>
                        <View style={styles.row}>
                            {(["member", "leader", "admin"] as const).map((r) => (
                                <Pressable
                                    key={r}
                                    style={[
                                        styles.roleBtn,
                                        form.role === r && styles.roleActive,
                                    ]}
                                    onPress={() => setForm((p) => ({ ...p, role: r }))}
                                >
                                    <Text
                                        style={[
                                            styles.roleText,
                                            form.role === r && { color: "#FFFFFF" },
                                        ]}
                                    >
                                        {r.toUpperCase()}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* MINISTÉRIOS */}
                        <Text style={styles.sectionTitle}>Ministérios</Text>
                        <ScrollView style={{ maxHeight: 180 }}>
                            {ministries.map((m) => {
                                const active = form.ministryIds.includes(m.id);
                                return (
                                    <Pressable
                                        key={m.id}
                                        style={[
                                            styles.ministry,
                                            active && styles.ministryActive,
                                        ]}
                                        onPress={() => toggleMinistry(m.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.ministryText,
                                                active && { color: "#FFFFFF" },
                                            ]}
                                        >
                                            {m.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        {/* SALVAR */}
                        <Pressable style={styles.save} onPress={save}>
                            <Text style={styles.saveText}>Salvar</Text>
                        </Pressable>

                        {/* CANCELAR */}
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

                        {invitePerson && (
                            <>
                                <Text style={{ marginBottom: 8 }}>
                                    Convite para <Text style={{ fontWeight: "800" }}>{invitePerson.name}</Text>
                                </Text>

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

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#FFFFFF",
    },

    title: {
        fontSize: 22,
        fontWeight: "800",
        marginBottom: 4,
    },

    subtitle: {
        color: "#374151",
        marginBottom: 12,
    },

    topActions: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 14,
    },

    primary: {
        flex: 1,
        backgroundColor: "#2563eb",
        paddingVertical: 14,
        borderRadius: 12,
    },

    primaryText: {
        color: "#FFFFFF",
        fontWeight: "800",
        textAlign: "center",
    },

    secondary: {
        flex: 1,
        backgroundColor: "#E5E7EB",
        paddingVertical: 14,
        borderRadius: 12,
    },

    secondaryText: {
        textAlign: "center",
        fontWeight: "800",
        color: "#111827",
    },

    groupBlock: {
        marginBottom: 8,
    },

    ministryTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: "#111827",
        marginTop: 10,
        marginBottom: 10,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 12,
        flexDirection: "row",
        gap: 12,
    },

    cardTitle: {
        fontWeight: "800",
        fontSize: 16,
        marginBottom: 2,
    },

    cardSub: {
        color: "#374151",
        marginTop: 2,
    },

    badgesRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    badgeOk: { backgroundColor: "#D1FAE5" },
    badgeBad: { backgroundColor: "#FEE2E2" },
    badgeInvite: { backgroundColor: "#DBEAFE" },
    badgeText: { fontWeight: "800", color: "#111827", fontSize: 12 },

    cardActions: {
        justifyContent: "space-between",
        alignItems: "flex-end",
    },

    smallBtn: {
        backgroundColor: "#E5E7EB",
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginBottom: 6,
    },

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
        marginBottom: 14,
    },

    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        color: "#111827",
    },

    row: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 12,
    },

    roleBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
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

    sectionTitle: {
        fontWeight: "800",
        marginBottom: 6,
        marginTop: 6,
    },

    ministry: {
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: "#E5E7EB",
        marginBottom: 8,
    },

    ministryActive: {
        backgroundColor: "#2563eb",
    },

    ministryText: {
        fontWeight: "800",
        color: "#111827",
    },

    save: {
        backgroundColor: "#065F46",
        paddingVertical: 16,
        borderRadius: 14,
        marginTop: 10,
    },

    saveText: {
        color: "#FFFFFF",
        fontWeight: "900",
        textAlign: "center",
    },

    cancel: {
        marginTop: 12,
        alignItems: "center",
    },

    logout: {
        marginTop: 16,
        backgroundColor: "#991B1B",
        paddingVertical: 16,
        borderRadius: 14,
    },

    logoutText: {
        color: "#FFFFFF",
        fontWeight: "900",
        textAlign: "center",
    },
    cardActionsRow: {
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
    },

    actionBtn: {
        backgroundColor: "#E5E7EB",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },

    actionText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#111827",
    },

});
