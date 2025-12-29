import { Person } from "@/src/services/people";
import { useEffect, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  scheduleLabel: string;
  people: Person[];
  currentPersonId: string;
  error?: string | null;
  suggestedPersonId?: string | null;

  // ✅ NOVO (opcional): pedir sugestão automática pro pai calcular
  onSuggestBest?: () => void;

  onCancel: () => void;
  onConfirm: (newPersonId: string) => void;
};

export function EditScheduleAssignmentModal({
  visible,
  scheduleLabel,
  people,
  currentPersonId,
  error,
  suggestedPersonId,
  onSuggestBest,
  onCancel,
  onConfirm,
}: Props) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // ✅ quando abrir/fechar, limpa seleção
  useEffect(() => {
    if (!visible) {
      setSelectedPersonId(null);
    }
  }, [visible]);

  // ✅ quando receber sugestão, auto-seleciona (se for válida)
  useEffect(() => {
    if (!visible) return;
    if (!suggestedPersonId) return;
    if (suggestedPersonId === currentPersonId) return;

    const exists = people.some((p) => p.id === suggestedPersonId);
    if (exists) setSelectedPersonId(suggestedPersonId);
  }, [visible, suggestedPersonId, currentPersonId, people]);

  function handleConfirm() {
    if (!selectedPersonId) return;
    onConfirm(selectedPersonId);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* HEADER */}
          <Text style={styles.title}>Editar turno — {scheduleLabel}</Text>

          {/* ✅ NOVO: CTA sugestão automática */}
          {!!onSuggestBest && (
            <Pressable style={styles.suggestBtn} onPress={onSuggestBest}>
              <Text style={styles.suggestText}>⭐ Melhor substituto</Text>
            </Pressable>
          )}

          {/* ERROR */}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* PEOPLE LIST (com scroll) */}
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {people.map((p) => {
              const isCurrent = p.id === currentPersonId;
              const isSelected = p.id === selectedPersonId;
              const isSuggested = p.id === suggestedPersonId;

              return (
                <Pressable
                  key={p.id}
                  disabled={isCurrent}
                  onPress={() => setSelectedPersonId(p.id)}
                  style={[
                    styles.personRow,
                    isCurrent && styles.currentRow,
                    isSelected && styles.selectedRow,
                    isSuggested && styles.suggestedRow,
                  ]}
                >
                  <Text
                    style={[
                      styles.personText,
                      isCurrent && styles.currentText,
                    ]}
                  >
                    {p.name}
                  </Text>

                  <View style={styles.badges}>
                    {isSuggested && (
                      <Text style={styles.badgeSuggested}>⭐ Sugestão</Text>
                    )}

                    {isCurrent && (
                      <Text style={styles.badgeCurrent}>Atual</Text>
                    )}

                    {isSelected && !isCurrent && (
                      <Text style={styles.badgeSelected}>Selecionado</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ACTIONS */}
          <View style={styles.actions}>
            <Pressable onPress={onCancel}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!selectedPersonId}
              style={[
                styles.confirmBtn,
                !selectedPersonId && styles.confirmDisabled,
              ]}
            >
              <Text style={styles.confirmText}>Confirmar troca</Text>
            </Pressable>
          </View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
    color: "#111827",
  },

  // ✅ NOVO
  suggestBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  suggestText: {
    color: "#166534",
    fontWeight: "900",
  },

  errorText: {
    color: "#DC2626",
    fontWeight: "700",
    marginBottom: 8,
  },

  // ✅ NOVO
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 6,
  },

  personRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currentRow: {
    backgroundColor: "#F3F4F6",
  },
  selectedRow: {
    backgroundColor: "#EFF6FF",
  },

  // ✅ NOVO: leve destaque pra sugestão mesmo quando não selecionado
  suggestedRow: {
    backgroundColor: "#F0FDF4",
  },

  personText: {
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    paddingRight: 10,
  },
  currentText: {
    color: "#6B7280",
  },

  // ✅ NOVO
  badges: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },

  badgeCurrent: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
  badgeSelected: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },

  // ✅ NOVO
  badgeSuggested: {
    fontSize: 12,
    fontWeight: "900",
    color: "#16A34A",
  },

  actions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "800",
    color: "#DC2626",
  },
  confirmBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  confirmDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: "#FFF",
    fontWeight: "900",
  },
});
