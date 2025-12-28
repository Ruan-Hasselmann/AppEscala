import { CalendarDayData, CalendarServiceStatus } from "@/src/components/CalendarDashboard";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  day: CalendarDayData | null;
  ministryName: string;
  onClose: () => void;
};

function statusLabel(status: CalendarServiceStatus) {
  if (status === "published") return "Publicado";
  if (status === "draft") return "Rascunho";
  return "Sem escala";
}

export function LeaderServiceDayModal({
  visible,
  day,
  ministryName,
  onClose,
}: Props) {
  if (!day) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* HEADER */}
          <Text style={styles.date}>
            {day.date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </Text>

          <Text style={styles.ministry}>{ministryName}</Text>

          {/* LISTA DE CULTOS */}
          <Text style={styles.section}>Cultos do dia</Text>

          {day.services.map((s, i) => (
            <View key={`${s.turno}-${i}`} style={styles.serviceCard}>
              <View>
                <Text style={styles.serviceLabel}>{s.turno}</Text>

                <Text
                  style={[
                    styles.status,
                    s.status === "published" && styles.published,
                    s.status === "draft" && styles.draft,
                    s.status === "empty" && styles.empty,
                  ]}
                >
                  {statusLabel(s.status)}
                </Text>
              </View>

              {/* AÇÕES */}
              {s.status === "empty" && (
                <Pressable style={styles.primary}>
                  <Text style={styles.primaryText}>Gerar escala</Text>
                </Pressable>
              )}

              {s.status === "draft" && (
                <View style={styles.actionsRow}>
                  <Pressable style={styles.secondary}>
                    <Text>Editar</Text>
                  </Pressable>

                  <Pressable style={styles.primary}>
                    <Text style={styles.primaryText}>Publicar</Text>
                  </Pressable>
                </View>
              )}

              {s.status === "published" && (
                <Pressable style={styles.secondary}>
                  <Text>Visualizar</Text>
                </Pressable>
              )}
            </View>
          ))}

          {/* FECHAR */}
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modal: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  date: {
    fontSize: 18,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  ministry: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },

  section: {
    fontWeight: "800",
    marginBottom: 8,
  },

  serviceCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },

  serviceLabel: {
    fontWeight: "700",
    marginBottom: 4,
  },

  status: {
    fontSize: 12,
    fontWeight: "700",
  },

  empty: { color: "#6B7280" },
  draft: { color: "#F59E0B" },
  published: { color: "#16A34A" },

  actionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  primary: {
    backgroundColor: "#2563EB",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  secondary: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    marginTop: 8,
  },

  close: {
    marginTop: 12,
    padding: 12,
    alignItems: "center",
  },

  closeText: {
    fontWeight: "700",
    color: "#374151",
  },
});
