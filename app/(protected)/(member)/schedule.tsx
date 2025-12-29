import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import {
  listPublishedSchedulesByPerson,
  updateAttendance,
} from "@/src/services/schedules";

import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

/* =========================
   CONSTANTS
========================= */

const TURN_ORDER: Record<string, number> = {
  manhã: 1,
  manha: 1,
  tarde: 2,
  noite: 3,
};

const MONTHS: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

/* =========================
   HELPERS
========================= */

function getServiceDayTime(s: any): number {
  if (!s.serviceDate || typeof s.serviceDate !== "string") return 0;

  const match = s.serviceDate
    .toLowerCase()
    .match(/(\d{1,2})\s+de\s+([a-zç]+)/i);

  if (!match) return 0;

  const day = Number(match[1]);
  const month = MONTHS[match[2]];

  if (!Number.isFinite(day) || month === undefined) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let date = new Date(today.getFullYear(), month, day);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() < today.getTime()) {
    date = new Date(today.getFullYear() + 1, month, day);
    date.setHours(0, 0, 0, 0);
  }

  return date.getTime();
}

/* =========================
   SCREEN
========================= */

export default function MemberSchedule() {
  const { user, logout } = useAuth();

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [declineTarget, setDeclineTarget] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  /* =========================
     LOAD
  ========================= */

  async function reload() {
    if (!user) return;

    setLoading(true);

    const data = await listPublishedSchedulesByPerson({
      personId: user.personId,
    });

    setSchedules(data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!user) return;

        setLoading(true);

        const data = await listPublishedSchedulesByPerson({
          personId: user.personId,
        });

        if (active) {
          setSchedules(data);
          setLoading(false);
        }
      }

      load();
      reload();
      return () => {
        active = false;
      };
    }, [user])
  );

  /* =========================
     BASE DATE
  ========================= */

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  /* =========================
     NEXT SERVICE
  ========================= */

  const nextServiceDayTime = useMemo(() => {
    const future = schedules
      .map((s) => getServiceDayTime(s))
      .filter((t) => t >= today)
      .sort((a, b) => a - b);

    return future.length ? future[0] : null;
  }, [schedules, today]);

  function isNextService(s: any) {
    if (!nextServiceDayTime) return false;
    return getServiceDayTime(s) === nextServiceDayTime;
  }

  /* =========================
     SORT
  ========================= */

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const aNext = isNextService(a);
      const bNext = isNextService(b);

      if (aNext && !bNext) return -1;
      if (!aNext && bNext) return 1;

      const timeA = getServiceDayTime(a);
      const timeB = getServiceDayTime(b);
      if (timeA !== timeB) return timeA - timeB;

      const orderA = TURN_ORDER[a.serviceLabel?.toLowerCase()] ?? 99;
      const orderB = TURN_ORDER[b.serviceLabel?.toLowerCase()] ?? 99;
      return orderA - orderB;
    });
  }, [schedules, nextServiceDayTime]);

  /* =========================
     ACTIONS (🔥 AJUSTE AQUI 🔥)
  ========================= */

  async function confirm(scheduleId: string) {
    if (!user) return;

    await updateAttendance({
      scheduleId,
      personId: user.personId,
      attendance: "confirmed",
    });

    setSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? {
            ...s,
            assignments: s.assignments.map((a: any) =>
              a.personId === user.personId
                ? { ...a, attendance: "confirmed" }
                : a
            ),
          }
          : s
      )
    );
    await reload();
  }

  async function decline(scheduleId: string, reason: string) {
    if (!user) return;

    await updateAttendance({
      scheduleId,
      personId: user.personId,
      attendance: "declined",
      reason,
    });

    setSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? {
            ...s,
            assignments: s.assignments.map((a: any) =>
              a.personId === user.personId
                ? { ...a, attendance: "declined" }
                : a
            ),
          }
          : s
      )
    );
    await reload();
  }

  function getMyAttendance(s: any) {
    return (
      s.assignments?.find(
        (a: any) => a.personId === user?.personId
      )?.attendance ?? "pending"
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Registrar presença"
        subtitle={`${user?.name} · Membro`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          {loading && <Text style={styles.empty}>Carregando...</Text>}

          {!loading && sortedSchedules.length === 0 && (
            <Text style={styles.empty}>Nenhuma escala publicada</Text>
          )}

          {sortedSchedules.map((s) => {
            const next = isNextService(s);

            return (
              <View
                key={s.id}
                style={[
                  styles.card,
                  next && styles.cardNext,
                  !next && styles.cardDisabled,
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.title, next && styles.titleNext]}>
                    {s.serviceLabel}
                  </Text>

                  {next && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>
                        PRÓXIMO CULTO
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.date}>{s.serviceDate}</Text>

                {getMyAttendance(s) === "pending" && next && (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.confirm}
                      onPress={() => confirm(s.id)}
                    >
                      <Text style={styles.confirmText}>
                        Confirmar presença
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => setDeclineTarget(s)}>
                      <Text style={styles.declineText}>
                        Não poderei servir
                      </Text>
                    </Pressable>
                  </View>
                )}

                {getMyAttendance(s) === "pending" && !next && (
                  <Text style={styles.locked}>
                    Disponível para confirmação apenas no próximo culto
                  </Text>
                )}

                {getMyAttendance(s) === "confirmed" && (
                  <Text style={styles.confirmed}>
                    ✅ Presença confirmada
                  </Text>
                )}

                {getMyAttendance(s) === "declined" && (
                  <Text style={styles.declined}>
                    ❌ Não poderá comparecer
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* MODAL MOTIVO */}
      <Modal visible={!!declineTarget} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Informar motivo</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex: viagem, trabalho, imprevisto..."
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setDeclineTarget(null);
                  setDeclineReason("");
                }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmBtn,
                  !declineReason && styles.confirmDisabled,
                ]}
                disabled={!declineReason}
                onPress={async () => {
                  await decline(declineTarget.id, declineReason);
                  setDeclineTarget(null);
                  setDeclineReason("");
                }}
              >
                <Text style={styles.confirmText}>Confirmar recusa</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },
  empty: { fontSize: 13, color: "#6B7280" },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  cardNext: {
    borderWidth: 2,
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },

  cardDisabled: { opacity: 0.55 },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { fontWeight: "800" },
  titleNext: { fontSize: 18, fontWeight: "900" },

  date: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },

  nextBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  nextBadgeText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11,
  },

  actions: { gap: 8 },

  confirm: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },

  confirmText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
  },

  declineText: {
    color: "#DC2626",
    fontWeight: "800",
    textAlign: "center",
    paddingVertical: 8,
  },

  locked: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  confirmed: { color: "#16A34A", fontWeight: "800" },
  declined: { color: "#DC2626", fontWeight: "800" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modal: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },

  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancelText: { fontWeight: "800", color: "#DC2626" },

  confirmBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  confirmDisabled: { opacity: 0.5 },
});
