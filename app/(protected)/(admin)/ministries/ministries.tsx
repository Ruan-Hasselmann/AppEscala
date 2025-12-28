import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  createMinistry,
  listMinistries,
  Ministry,
  updateMinistry,
} from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

/* =========================
   SCREEN
========================= */

type MinistryStats = {
  members: number;
  leaders: number;
};

export default function AdminMinistries() {
  const { user, logout } = useAuth();

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [stats, setStats] = useState<Record<string, MinistryStats>>(
    {}
  );

  const [selected, setSelected] = useState<Ministry | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  /* =========================
     LOAD
  ========================= */

  async function load() {
    const [m, p] = await Promise.all([
      listMinistries(),
      listPeople(),
    ]);

    // 🔤 ordenação alfabética
    m.sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR", {
        sensitivity: "base",
      })
    );

    setMinistries(m);
    setPeople(p);

    // 📊 calcula estatísticas
    const map: Record<string, MinistryStats> = {};

    p.forEach((person) => {
      person.ministries.forEach((entry) => {
        if (!map[entry.ministryId]) {
          map[entry.ministryId] = { members: 0, leaders: 0 };
        }

        map[entry.ministryId].members += 1;

        if (entry.role === "leader") {
          map[entry.ministryId].leaders += 1;
        }
      });
    });

    setStats(map);
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  /* =========================
     ACTIONS
  ========================= */

  async function handleSave() {
    if (!name.trim()) return;

    if (selected) {
      await updateMinistry(selected.id, {
        name: name.trim(),
        description: description.trim(),
      });
    } else {
      await createMinistry({
        name: name.trim(),
        description: description.trim(),
      });
    }

    closeModal();
    await load();
  }

  function openCreate() {
    setSelected(null);
    setName("");
    setDescription("");
    setIsModalOpen(true);
  }

  function openEdit(m: Ministry) {
    setSelected(m);
    setName(m.name);
    setDescription(m.description ?? "");
    setIsModalOpen(true);
  }

  function closeModal() {
    setSelected(null);
    setName("");
    setDescription("");
    setIsModalOpen(false);
  }

  async function toggleStatus(m: Ministry) {
    await updateMinistry(m.id, {
      active: !m.active,
    });

    await load();
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Ministérios"
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />
      <ScrollView>
        <View style={styles.container}>
          <Pressable style={styles.addBtn} onPress={openCreate}>
            <Text style={styles.addText}>Novo ministério</Text>
          </Pressable>
          {ministries.length === 0 ? (
            <Text style={styles.empty}>
              Nenhum ministério cadastrado
            </Text>
          ) : (
            ministries.map((m) => {
              const s = stats[m.id] ?? {
                members: 0,
                leaders: 0,
              };

              return (
                <Pressable
                  key={m.id}
                  style={({ pressed }) => [
                    styles.card,
                    !m.active && styles.cardInactive,
                    pressed && { opacity: 0.85 },
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/(protected)/(admin)/ministries/[ministryId]",
                      params: { ministryId: m.id },
                    })
                  }
                >
                  <View>
                    <Text style={styles.name}>{m.name}</Text>

                    {m.description ? (
                      <Text style={styles.desc}>
                        {m.description}
                      </Text>
                    ) : null}

                    <Text style={styles.stats}>
                      👥 {s.members} membros · ⭐ {s.leaders} líderes
                    </Text>
                  </View>

                  <View style={styles.actions}>
                    <Pressable
                      style={styles.edit}
                      onPress={() => openEdit(m)}
                    >
                      <Text style={styles.editText}>
                        Editar
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.status,
                        !m.active &&
                        styles.statusInactive,
                      ]}
                      onPress={() => toggleStatus(m)}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          !m.active &&
                          styles.statusTextInactive,
                        ]}
                      >
                        {m.active ? "Ativo" : "Inativo"}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* MODAL */}
        <Modal
          visible={isModalOpen}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.overlay}>
            <KeyboardAvoidingView
              style={styles.container}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modal}>
                <Text style={styles.modalTitle}>
                  {selected
                    ? "Editar ministério"
                    : "Novo ministério"}
                </Text>

                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nome do ministério"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={true}
                  spellCheck={true}
                  style={styles.input}
                />

                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Descrição (opcional)"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="words"
                  autoCorrect={true}
                  spellCheck={true}
                  style={[styles.input, styles.textarea]}
                  multiline
                />

                <View style={styles.footer}>
                  <Pressable
                    style={styles.cancel}
                    onPress={closeModal}
                  >
                    <Text style={styles.cancelText}>
                      Cancelar
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.save,
                      !name.trim() && { opacity: 0.5 },
                    ]}
                    disabled={!name.trim()}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveText}>
                      Salvar
                    </Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </ScrollView>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

  empty: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: 40,
  },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },

  cardInactive: {
    opacity: 0.45,
  },

  name: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },

  desc: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },

  stats: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  edit: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },

  editText: {
    fontWeight: "700",
    color: "#111827",
  },

  status: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
  },

  statusInactive: {
    backgroundColor: "#FEE2E2",
  },

  statusText: {
    fontWeight: "700",
    color: "#166534",
  },

  statusTextInactive: {
    color: "#991B1B",
  },

  addBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },

  addText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },

  modal: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  textarea: { minHeight: 70 },

  footer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  cancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },

  cancelText: {
    fontWeight: "700",
    color: "#374151",
  },

  save: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },

  saveText: {
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
