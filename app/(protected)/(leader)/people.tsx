import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
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
    listPeopleByMinistry,
    markPersonInvited,
    Person,
    updatePerson
} from "../../../src/services/people";

type PersonForm = {
    name: string;
    email: string;
    role: "member" | "leader";
    ministryId: string;
};

export default function AdminPeople() {
    const { user, logout } = useAuth();
    if (!user) return null;

    const userSafe = user;

    const canManage = userSafe.role === "admin" || userSafe.role === "leader";
    if (!canManage) return null;

    const [ministries, setMinistries] = useState<Ministry[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);

    // modal create/edit
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<Person | null>(null);
    const [form, setForm] = useState<PersonForm>({
        name: "",
        email: "",
        role: "member",
        ministryId: "",
    });

    // modal invite
    const [inviteVisible, setInviteVisible] = useState(false);
    const [invitePerson, setInvitePerson] = useState<Person | null>(null);

    async function loadAll() {
        setLoading(true);

        const mins = await listActiveMinistries();
        let ppl: Person[] = [];

        if (userSafe.role === "leader" && userSafe.ministryId) {
            ppl = await listPeopleByMinistry(userSafe.ministryId);
        }

        setMinistries(mins);
        setPeople(ppl);
        setLoading(false);
    }

    useEffect(() => {
        loadAll();
    }, []);

    async function handleSeed() {
        try {
            await seedDefaultMinistries();
            await loadAll();
            Alert.alert("OK", "Ministérios padrão criados/atualizados.");
        } catch (e: any) {
            Alert.alert("Erro", e?.message ?? "Falha ao criar ministérios.");
        }
    }

    function openCreate() {
        setEditing(null);
        setForm({
            name: "",
            email: "",
            role: "member",
            ministryId: ministries[0]?.id ?? "",
        });
        setModalVisible(true);
    }

    function openEdit(p: Person) {
        setEditing(p);
        setForm({
            name: p.name,
            email: p.email,
            role: p.role,
            ministryId: p.ministryId,
        });
        setModalVisible(true);
    }

    async function saveForm() {
        try {
            if (!form.name || !form.email || !form.ministryId) {
                Alert.alert("Atenção", "Preencha nome, email e ministério.");
                return;
            }

            if (editing) {
                await updatePerson(editing.id, form);
            } else {
                await createPerson(form);
            }

            setModalVisible(false);
            await loadAll();
        } catch (e: any) {
            Alert.alert("Erro", e?.message ?? "Falha ao salvar.");
        }
    }

    function buildInviteLink(p: Person) {
        return Linking.createURL("/register", {
            queryParams: { personId: p.id },
        });
    }

    async function copyInvite() {
        if (!invitePerson) return;
        const url = buildInviteLink(invitePerson);
        await Clipboard.setStringAsync(url);
        Alert.alert("Copiado", "Link copiado.");
    }

    async function sendWhatsApp() {
        if (!invitePerson) return;
        const url = buildInviteLink(invitePerson);
        const text = `Olá! Aqui está seu link para ativar sua conta:\n\n${url}`;
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
        await markPersonInvited(invitePerson.id);
        await loadAll();
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Pessoas</Text>
                <Text>Carregando...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Gerenciar Pessoas</Text>

            <View style={styles.topActions}>
                <TouchableOpacity style={styles.primary} onPress={openCreate}>
                    <Text style={styles.primaryText}>+ Cadastrar</Text>
                </TouchableOpacity>

                {userSafe.role === "admin" && (
                    <TouchableOpacity style={styles.secondary} onPress={handleSeed}>
                        <Text style={styles.secondaryText}>Criar ministérios</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView>
                {people.map((p) => (
                    <View key={p.id} style={styles.card}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{p.name}</Text>
                            <Text>{p.email}</Text>
                            <Text>
                                {p.role.toUpperCase()} • {p.ministryId}
                            </Text>
                        </View>

                        <View style={styles.cardActions}>
                            <TouchableOpacity onPress={() => openEdit(p)}>
                                <Text>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => {
                                    setInvitePerson(p);
                                    setInviteVisible(true);
                                }}
                            >
                                <Text>Convidar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Invite modal */}
            <Modal visible={inviteVisible} transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Convite</Text>

                        <Pressable style={styles.saveButton} onPress={copyInvite}>
                            <Text style={styles.saveButtonText}>Copiar link</Text>
                        </Pressable>

                        <Pressable style={styles.saveButton} onPress={sendWhatsApp}>
                            <Text style={styles.saveButtonText}>Enviar WhatsApp</Text>
                        </Pressable>

                        <Pressable onPress={() => setInviteVisible(false)}>
                            <Text>Fechar</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            <TouchableOpacity style={styles.logout} onPress={logout}>
                <Text style={styles.logoutText}>Sair</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 22, fontWeight: "bold", marginBottom: 4 },
    subtitle: { color: "#374151", marginBottom: 12 },

    topActions: { flexDirection: "row", gap: 8, marginBottom: 10 },
    primary: { flex: 1, backgroundColor: "#2563eb", padding: 12, borderRadius: 10 },
    primaryText: { color: "#fff", fontWeight: "700", textAlign: "center" },
    secondary: { flex: 1, backgroundColor: "#E5E7EB", padding: 12, borderRadius: 10 },
    secondaryText: { textAlign: "center", fontWeight: "700" },

    card: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 10,
        flexDirection: "row",
        gap: 10,
    },
    cardTitle: { fontWeight: "800", fontSize: 16 },
    cardSub: { color: "#374151", marginTop: 2 },

    badgesRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    badgeOk: { backgroundColor: "#D1FAE5" },
    badgeBad: { backgroundColor: "#FEE2E2" },
    badgeInvite: { backgroundColor: "#DBEAFE" },
    badgeText: { fontWeight: "700", color: "#111827", fontSize: 12 },

    cardActions: { justifyContent: "space-between" },
    smallBtn: { backgroundColor: "#E5E7EB", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },

    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
    modalContent: { width: "90%", backgroundColor: "#fff", borderRadius: 12, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 12 },

    input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, marginBottom: 10 },

    row: { flexDirection: "row", gap: 10, marginBottom: 10 },
    toggleBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#E5E7EB", alignItems: "center" },
    toggleActive: { backgroundColor: "#1E3A8A" },
    toggleText: { fontWeight: "700", color: "#111827" },

    sectionTitle: { fontWeight: "800", marginBottom: 6 },
    option: { padding: 10, borderRadius: 10, backgroundColor: "#E5E7EB", marginBottom: 6 },
    optionSelected: { backgroundColor: "#2563eb" },
    optionText: { fontWeight: "700" },
    optionTextSelected: { color: "#fff" },

    saveButton: { backgroundColor: "#065F46", padding: 12, borderRadius: 10, marginTop: 4 },
    saveButtonText: { color: "#fff", fontWeight: "800", textAlign: "center" },

    cancelButton: { marginTop: 10, alignItems: "center" },

    inviteBox: { backgroundColor: "#F3F4F6", borderRadius: 10, padding: 10, marginBottom: 10 },
    inviteText: { color: "#111827" },

    logout: { marginTop: 12, backgroundColor: "#991B1B", padding: 14, borderRadius: 10 },
    logoutText: { color: "#fff", fontWeight: "800", textAlign: "center" },
});
