// src/app/(admin)/ministries.tsx
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  createMinistry,
  listMinistries,
  Ministry,
  updateMinistry,
} from "@/src/services/ministries";

/* =========================
   COMPONENT
========================= */

export default function AdminMinistries() {
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  /* =========================
     LOAD
  ========================= */

  async function load() {
    setLoading(true);
    const data = await listMinistries();
    setMinistries(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  /* =========================
     ACTIONS
  ========================= */

  async function handleCreate() {
    if (!name.trim()) return;

    await createMinistry({
      name: name.trim(),
      description: description.trim(),
    });

    setName("");
    setDescription("");
    await load();
  }

  async function toggleActive(ministry: Ministry) {
    await updateMinistry(ministry.id, {
      active: !ministry.active,
    });
    await load();
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ministérios</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Nome do ministério"
          autoCapitalize="words"
          keyboardType="default"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Descrição (opcional)"
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.button} onPress={handleCreate}>
          <Text style={styles.buttonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {loading && <Text>Carregando…</Text>}

        {ministries.map((m) => (
          <View key={m.id} style={styles.listItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{m.name}</Text>
              {!!m.description && (
                <Text style={styles.itemSub}>{m.description}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.toggle,
                !m.active && { backgroundColor: "#FEE2E2" },
              ]}
              onPress={() => toggleActive(m)}
            >
              <Text style={styles.toggleText}>
                {m.active ? "Ativo" : "Inativo"}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
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
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    textAlign: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
  },
  itemTitle: {
    fontWeight: "800",
  },
  itemSub: {
    color: "#6B7280",
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#D1FAE5",
  },
  toggleText: {
    fontWeight: "800",
    fontSize: 12,
  },
});
