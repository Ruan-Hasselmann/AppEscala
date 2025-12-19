import { useMemo, useState } from "react";
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

import {
  activateMinistry,
  createMinistry,
  deactivateMinistry,
  findMinistryByName,
  Ministry,
  seedDefaultMinistries,
} from "../services/ministries";

type Props = {
  visible: boolean;
  onClose: () => void;
  ministries: Ministry[];
  onReload: () => Promise<void>;
};

type ConfirmAction =
  | { type: "seed" }
  | { type: "deactivate"; id: string }
  | { type: "activate"; id: string }
  | { type: "reactivate-existing"; id: string };

export default function AdminMinistriesModal({
  visible,
  onClose,
  ministries,
  onReload,
}: Props) {
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  /* =======================
     LISTAS ORDENADAS
  ======================= */

  const active = useMemo(
    () =>
      ministries
        .filter((m) => m.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ministries]
  );

  const inactive = useMemo(
    () =>
      ministries
        .filter((m) => !m.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [ministries]
  );

  /* =======================
     CREATE / SEED
  ======================= */

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = await findMinistryByName(trimmed);

    if (!existing) {
      await createMinistry(trimmed.toUpperCase());
      setName("");
      await onReload();
      return;
    }

    if (!existing.active) {
      setConfirm({ type: "reactivate-existing", id: existing.id });
    }
  }

  /* =======================
     CONFIRM EXECUTION
  ======================= */

  async function handleConfirm() {
    if (!confirm) return;

    switch (confirm.type) {
      case "seed":
        await seedDefaultMinistries();
        break;

      case "deactivate":
        await deactivateMinistry(confirm.id);
        break;

      case "activate":
      case "reactivate-existing":
        await activateMinistry(confirm.id);
        break;
    }

    setConfirm(null);
    setName("");
    await onReload();
  }

  function confirmTitle() {
    switch (confirm?.type) {
      case "seed":
        return "Criar ministérios padrão";
      case "deactivate":
        return "Desativar ministério";
      case "activate":
      case "reactivate-existing":
        return "Ativar ministério";
      default:
        return "";
    }
  }

  function confirmMessage() {
    switch (confirm?.type) {
      case "seed":
        return "Isso irá criar ou reativar os ministérios padrão.";
      case "deactivate":
        return "Este ministério ficará inativo, mas os vínculos serão preservados.";
      case "activate":
      case "reactivate-existing":
        return "Deseja ativar este ministério novamente?";
      default:
        return "";
    }
  }

  const isDanger = confirm?.type === "deactivate";

  /* =======================
     RENDER
  ======================= */

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Ministérios</Text>

          <TextInput
            placeholder="Novo ministério"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <View style={styles.actionsRow}>
            <Pressable style={styles.primary} onPress={handleCreate}>
              <Text style={styles.primaryText}>Criar</Text>
            </Pressable>

            <Pressable
              style={styles.seedBtn}
              onPress={() => setConfirm({ type: "seed" })}
            >
              <Text style={styles.seedText}>Seed</Text>
            </Pressable>
          </View>

          <ScrollView style={{ marginTop: 12 }}>
            <Text style={styles.section}>Ativos</Text>
            {active.map((m) => (
              <Row
                key={m.id}
                name={m.name}
                action="Excluir"
                actionStyle={styles.deleteText}
                onPress={() => setConfirm({ type: "deactivate", id: m.id })}
              />
            ))}

            <Text style={styles.section}>Inativos</Text>
            {inactive.map((m) => (
              <Row
                key={m.id}
                name={m.name}
                action="Ativar"
                actionStyle={styles.activateText}
                onPress={() => setConfirm({ type: "activate", id: m.id })}
              />
            ))}
          </ScrollView>

          <Pressable style={styles.close} onPress={onClose}>
            <Text>Fechar</Text>
          </Pressable>
        </View>

        {/* MODAL CONFIRMAÇÃO */}
        <Modal visible={!!confirm} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>{confirmTitle()}</Text>
              <Text style={styles.confirmText}>{confirmMessage()}</Text>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !isDanger && styles.confirmBtnOk,
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmBtnText}>Confirmar</Text>
              </TouchableOpacity>

              <Pressable
                onPress={() => setConfirm(null)}
                style={{ marginTop: 10 }}
              >
                <Text>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

/* =======================
   COMPONENTS
======================= */

function Row({
  name,
  action,
  actionStyle,
  onPress,
}: {
  name: string;
  action: string;
  actionStyle: any;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{name}</Text>
      <Pressable onPress={onPress}>
        <Text style={[styles.action, actionStyle]}>{action}</Text>
      </Pressable>
    </View>
  );
}

/* =======================
   STYLES
======================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "92%",
    maxHeight: "85%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  section: { marginTop: 14, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  primary: {
    flex: 1,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryText: { color: "#FFF", fontWeight: "800", textAlign: "center" },
  seedBtn: {
    width: 72,
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  seedText: { fontWeight: "800" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowText: { fontWeight: "700" },
  action: { fontWeight: "800" },

  deleteText: { color: "#DC2626" },
  activateText: { color: "#166534" },

  close: { marginTop: 12, alignItems: "center" },

  confirmBox: {
    width: "80%",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  confirmTitle: { fontWeight: "800", marginBottom: 6 },
  confirmText: { textAlign: "center", marginBottom: 14 },

  confirmBtn: {
    width: "100%",
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmBtnOk: {
    backgroundColor: "#16A34A",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
});
