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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

/* =========================
   HELPERS
========================= */

function toDayTime(value: any): number | null {
  // Firestore Timestamp
  if (value?.toDate) {
    const d: Date = value.toDate();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // JS Date
  if (value instanceof Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  // ISO string
  if (typeof value === "string") {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) {
      const d = new Date(t);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
  }

  return null;
}

function getScheduleDayTime(s: any): number {
  // ✅ fonte de verdade: Schedule.serviceDayDate
  const t = toDayTime(s.serviceDayDate);
  if (t !== null) return t;

  // fallback: tenta serviceDate (string) se existir ISO
  const t2 = toDayTime(s.serviceDate);
  if (t2 !== null) return t2;

  return Number.MAX_SAFE_INTEGER;
}

function getTurnOrder(label?: string): number {
  if (!label) return 99;
  return TURN_ORDER[label.toLowerCase()] ?? 99;
}

/* =========================
   SCREEN
========================= */

export default function MemberSchedule() {
  const { user, logout } = useAuth();

  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD
  ========================= */

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!user) return;

        setLoading(true);

        const data = await listPublishedSchedulesByPerson({
          personId: user.personId,
        });

        setSchedules(data);
        setLoading(false);
      }

      load();
    }, [user])
  );

  /* =========================
     HOJE
  ========================= */

  const todayTime = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  /* =========================
     FILTRA FUTURO + ORDENA
  ========================= */

  const futureOrdered = useMemo(() => {
    const onlyFuture = schedules.filter((s) => {
      const t = getScheduleDayTime(s);
      return t >= todayTime;
    });

    return onlyFuture.sort((a, b) => {
      const dayA = getScheduleDayTime(a);
      const dayB = getScheduleDayTime(b);
      if (dayA !== dayB) return dayA - dayB;

      return getTurnOrder(a.serviceLabel) - getTurnOrder(b.serviceLabel);
    });
  }, [schedules, todayTime]);

  /* =========================
     PRÓXIMO DIA (todos do dia)
  ========================= */

  const nextDayTime = useMemo(() => {
    if (futureOrdered.length === 0) return null;
    return getScheduleDayTime(futureOrdered[0]);
  }, [futureOrdered]);

  function isNextDay(s: any) {
    const t = getScheduleDayTime(s);
    return nextDayTime !== null && t === nextDayTime;
  }

  /* =========================
     ACTIONS
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
        s.id === scheduleId ? { ...s, attendance: "confirmed" } : s
      )
    );
  }

  async function decline(scheduleId: string) {
    if (!user) return;

    await updateAttendance({
      scheduleId,
      personId: user.personId,
      attendance: "declined",
    });

    setSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId ? { ...s, attendance: "declined" } : s
      )
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Minhas escalas"
        subtitle={`${user?.name} · Membro`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          {loading && <Text style={styles.empty}>Carregando...</Text>}

          {!loading && futureOrdered.length === 0 && (
            <Text style={styles.empty}>Nenhuma escala futura publicada</Text>
          )}

          {futureOrdered.map((s) => {
            const next = isNextDay(s);

            return (
              <View key={s.id} style={[styles.card, next && styles.cardNext]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>
                    {s.serviceLabel} · {s.ministryName}
                  </Text>

                  {next && (
                    <View style={styles.nextBadge}>
                      <Text style={styles.nextBadgeText}>PRÓXIMO</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.date}>{s.serviceDate}</Text>

                {s.attendance === "pending" && next && (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.confirm}
                      onPress={() => confirm(s.id)}
                    >
                      <Text style={styles.confirmText}>Confirmar presença</Text>
                    </Pressable>

                    <Pressable
                      style={styles.decline}
                      onPress={() => decline(s.id)}
                    >
                      <Text style={styles.declineText}>Não poderei servir</Text>
                    </Pressable>
                  </View>
                )}

                {s.attendance === "pending" && !next && (
                  <Text style={styles.locked}>
                    Disponível para confirmação apenas no próximo dia de culto
                  </Text>
                )}

                {s.attendance === "confirmed" && (
                  <Text style={styles.confirmed}>✅ Presença confirmada</Text>
                )}

                {s.attendance === "declined" && (
                  <Text style={styles.declined}>❌ Não poderá comparecer</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: { fontWeight: "800" },

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
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },

  confirmText: { color: "#FFF", fontWeight: "800" },

  decline: { paddingVertical: 10, alignItems: "center" },
  declineText: { color: "#DC2626", fontWeight: "800" },

  locked: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  confirmed: { color: "#16A34A", fontWeight: "800" },
  declined: { color: "#DC2626", fontWeight: "800" },
});
