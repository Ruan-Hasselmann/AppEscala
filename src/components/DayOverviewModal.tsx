import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CalendarDayData,
  CalendarServiceStatus,
} from "./CalendarDashboard";

/* =========================
   PROPS
========================= */

type Props = {
  visible: boolean;
  day: CalendarDayData | null;
  onClose: () => void;
  mode?: "admin" | "leader";
};

/* =========================
   HELPERS
========================= */

function statusLabel(status: CalendarServiceStatus) {
  if (status === "published") return "Publicado";
  if (status === "draft") return "Rascunho";
  return "Sem escala";
}

function statusStyle(status: CalendarServiceStatus) {
  if (status === "published") return styles.published;
  if (status === "draft") return styles.draft;
  return styles.empty;
}

/* =========================
   COMPONENT
========================= */

export function DayOverviewModal({
  visible,
  day,
  onClose,
  mode = "admin",
}: Props) {
  if (!day) return null;

  // 🔥 Agrupa por TURNO
  const byTurno = day.services.reduce((acc, s) => {
    if (!acc[s.turno]) acc[s.turno] = [];
    acc[s.turno].push(s);
    return acc;
  }, {} as Record<string, typeof day.services>);

  // 🔥 Ordena ministérios dentro do turno
  Object.values(byTurno).forEach((services) => {
    services.sort((a, b) =>
      a.ministry.localeCompare(b.ministry, "pt-BR")
    );
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {day.date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </Text>

          <Text style={styles.subtitle}>
            {mode === "admin"
              ? "Visão administrativa"
              : "Visão do líder"}
          </Text>

          <ScrollView style={styles.content}>
            {Object.entries(byTurno).map(([turno, services]) => (
              <View key={turno} style={styles.turnoBlock}>
                <Text style={styles.turnoTitle}>{turno}</Text>

                {services.map((s, idx) => (
                  <View key={idx} style={styles.serviceCard}>
                    <View style={styles.serviceHeader}>
                      <Text style={styles.serviceTitle}>
                        {s.ministry}
                      </Text>

                      <View
                        style={[
                          styles.statusPill,
                          statusStyle(s.status),
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {statusLabel(s.status)}
                        </Text>
                      </View>
                    </View>

                    {/* PESSOAS */}
                    {s.people && s.people.length > 0 ? (
                      s.people.map((p, i) => {
                        const attendance = p.attendance ?? "pending";

                        return (
                          <Text
                            key={i}
                            style={[
                              styles.person,
                              attendance === "declined" && styles.personDeclined,
                              attendance === "confirmed" && styles.personConfirmed,
                              attendance === "pending" && styles.personPending,
                            ]}
                          >
                            • {p.name}
                            {attendance === "declined" && " (recusou)"}
                            {attendance === "confirmed" && " (confirmou)"}
                            {attendance === "pending" && " (pendente)"}
                          </Text>
                        );
                      })
                    ) : (
                      <Text style={styles.emptyText}>
                        Nenhuma pessoa escalada
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

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
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },

  title: {
    fontSize: 18,
    fontWeight: "900",
    textTransform: "capitalize",
  },

  subtitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 12,
  },

  content: {
    marginBottom: 12,
  },

  turnoBlock: {
    marginBottom: 16,
  },

  turnoTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  serviceCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },

  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  serviceTitle: {
    fontWeight: "800",
  },

  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  published: { backgroundColor: "#DCFCE7" },
  draft: { backgroundColor: "#FEF3C7" },
  empty: { backgroundColor: "#E5E7EB" },

  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },

  person: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "700",
    color: "#111827",
  },

  personDeclined: {
    color: "#DC2626",
    fontWeight: "800",
  },

  personConfirmed: {
    color: "#16A34A",
    fontWeight: "800",
  },

  personPending: {
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },

  close: {
    marginTop: 8,
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
