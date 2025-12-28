import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

/* =========================
   TYPES
========================= */

type Candidate = {
  id: string;
  name: string;
  warnings?: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;

  // contexto
  ministryName: string;
  serviceLabel: string;
  serviceDate: string;

  declinedPersonName: string;

  candidates: Candidate[];

  onConfirm: (personId: string) => void;
};

/* =========================
   COMPONENT
========================= */

export function ReplaceMemberModal({
  visible,
  onClose,
  ministryName,
  serviceLabel,
  serviceDate,
  declinedPersonName,
  candidates,
  onConfirm,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Substituir membro</Text>

          <Text style={styles.subtitle}>
            {ministryName} · {serviceLabel}
          </Text>

          <Text style={styles.context}>
            {serviceDate}
          </Text>

          <View style={styles.declinedBox}>
            <Text style={styles.declinedLabel}>Recusou presença</Text>
            <Text style={styles.declinedName}>❌ {declinedPersonName}</Text>
          </View>

          <Text style={styles.sectionTitle}>
            Pessoas disponíveis
          </Text>

          {candidates.length === 0 ? (
            <Text style={styles.empty}>
              Nenhuma pessoa disponível para substituição
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 280 }}>
              {candidates.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.personCard}
                  onPress={() => onConfirm(p.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.name}</Text>

                    {p.warnings && p.warnings.length > 0 && (
                      <View style={{ marginTop: 6 }}>
                        {p.warnings.map((w, i) => (
                          <Text key={i} style={styles.warning}>
                            {w}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>

                  <Text style={styles.select}>Selecionar</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
  },

  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 2,
  },

  context: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },

  declinedBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  declinedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },

  declinedName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#DC2626",
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  empty: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },

  personCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  personName: {
    fontWeight: "800",
    color: "#111827",
  },

  warning: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  select: {
    fontWeight: "800",
    color: "#2563EB",
  },

  close: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },

  closeText: {
    color: "#FFF",
    fontWeight: "800",
  },
});
