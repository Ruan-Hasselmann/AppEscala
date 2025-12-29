import { router } from "expo-router";
import { useMemo, useState } from "react";
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
import { ReplaceMemberModal } from "./ReplaceMemberModal";

/* =========================
   TYPES
========================= */

type ReplaceContext = {
  scheduleId: string;
  ministryName: string;
  serviceLabel: string;
  serviceDate: string;
  declinedPersonName: string;
};

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
  const [replaceContext, setReplaceContext] =
    useState<ReplaceContext | null>(null);

  const safeDay = day;

  const byTurno = useMemo(() => {
    if (!safeDay) return {};
    return safeDay.services.reduce((acc, s) => {
      if (!acc[s.turno]) acc[s.turno] = [];
      acc[s.turno].push(s);
      return acc;
    }, {} as Record<string, typeof safeDay.services>);
  }, [safeDay]);

  if (!safeDay) return null;

  /* =========================
     RENDER
  ========================= */

  return (
    <>
      {/* ================= MODAL PRINCIPAL ================= */}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>
              {safeDay.date.toLocaleDateString("pt-BR", {
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

                      {s.people?.map((p) => {
                        const attendance =
                          p.attendance ?? "pending";

                        return (
                          <View
                            key={p.id}
                            style={styles.personRow}
                          >
                            <Text style={styles.person}>
                              • {p.name} ({attendance})
                            </Text>

                            {mode === "leader" &&
                              s.status === "published" &&
                              attendance === "declined" && (
                                <Pressable
                                  onPress={() => {
                                    onClose(); // fecha modal principal
                                    router.replace("/(protected)/(leader)/schedule/declines");
                                  }}
                                >
                                  <Text style={styles.replaceBtn}>
                                    Substituir
                                  </Text>
                                </Pressable>
                              )}
                          </View>
                        );
                      })}
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

      {/* ================= MODAL DE SUBSTITUIÇÃO ================= */}
      <ReplaceMemberModal
        visible={!!replaceContext}
        onClose={() => setReplaceContext(null)}
        ministryName={replaceContext?.ministryName ?? ""}
        serviceLabel={replaceContext?.serviceLabel ?? ""}
        serviceDate={replaceContext?.serviceDate ?? ""}
        declinedPersonName={
          replaceContext?.declinedPersonName ?? ""
        }
        candidates={[]}
        onConfirm={() => { }}
      />
    </>
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

  content: { marginBottom: 12 },

  turnoBlock: { marginBottom: 16 },

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

  serviceTitle: { fontWeight: "800" },

  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  published: { backgroundColor: "#DCFCE7" },
  draft: { backgroundColor: "#FEF3C7" },
  empty: { backgroundColor: "#E5E7EB" },

  statusText: { fontSize: 12, fontWeight: "800" },

  personRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  person: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  personConfirmed: { color: "#16A34A", fontWeight: "800" },
  personDeclined: { color: "#DC2626", fontWeight: "800" },
  personPending: { color: "#92400E", fontWeight: "800" },

  replaceBtn: {
    color: "#2563EB",
    fontWeight: "800",
    fontSize: 13,
  },

  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
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
