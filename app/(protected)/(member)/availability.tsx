import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import {
  listAvailabilityByPerson,
  toggleAvailability,
} from "@/src/services/availabilities";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";
import { getServicesByServiceDay } from "@/src/services/services";
import { getAppSettings } from "@/src/services/settings";

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
   TYPES
========================= */

type ServiceDayWithTurnos = {
  id: string;
  date: Date;
  turnos: string[];
};

/* =========================
   HELPERS
========================= */

function getNextMonth(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth() + 1, 1);
}

/* =========================
   SCREEN
========================= */

export default function MemberAvailability() {
  const { user, logout } = useAuth();

  // 🔥 mês alvo sempre é o próximo
  const targetMonth = useMemo(() => getNextMonth(), []);

  const [days, setDays] = useState<ServiceDayWithTurnos[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<
    Map<string, Set<string>>
  >(new Map());

  const [canEdit, setCanEdit] = useState(true);
  const [windowLabel, setWindowLabel] = useState("");

  /* =========================
     LOAD
  ========================= */

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (!user) return;

        const [settings, serviceDays, availabilities] =
          await Promise.all([
            getAppSettings(),
            getServiceDaysByMonth(targetMonth),
            listAvailabilityByPerson({ personId: user.personId }),
          ]);

        /* ===== janela de disponibilidade ===== */

        const today = new Date();
        const day = today.getDate();

        const open = settings.availability.openDay;
        const close = settings.availability.closeDay;

        const editable = day >= open && day <= close;
        setCanEdit(editable);

        setWindowLabel(
          editable
            ? `Preencher até dia ${close}`
            : `Encerrada em ${close}`
        );

        /* ===== mapa de disponibilidade ===== */

        const map = new Map<string, Set<string>>();
        availabilities.forEach((a) => {
          if (!map.has(a.serviceDayId)) {
            map.set(a.serviceDayId, new Set());
          }
          map.get(a.serviceDayId)!.add(a.serviceLabel);
        });
        setAvailabilityMap(map);

        /* ===== turnos reais por dia ===== */

        const enriched: ServiceDayWithTurnos[] = await Promise.all(
          serviceDays.map(async (d) => {
            const services = await getServicesByServiceDay(d.id);
            return {
              id: d.id,
              date: d.date,
              turnos: services.map((s) => s.label),
            };
          })
        );

        setDays(enriched);
      }

      load();
    }, [user, targetMonth])
  );

  /* =========================
     ACTIONS
  ========================= */

  async function toggle(dayId: string, turno: string) {
    if (!user || !canEdit) return;

    await toggleAvailability({
      personId: user.personId,
      serviceDayId: dayId,
      serviceLabel: turno,
    });

    setAvailabilityMap((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(dayId) ?? []);
      if (set.has(turno)) set.delete(turno);
      else set.add(turno);
      next.set(dayId, set);
      return next;
    });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Minha disponibilidade"
        subtitle={`Escala de ${targetMonth.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })}`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          {/* STATUS DA JANELA */}
          <View
            style={[
              styles.windowBadge,
              canEdit ? styles.windowOpen : styles.windowClosed,
            ]}
          >
            <Text style={styles.windowText}>{windowLabel}</Text>
          </View>

          {days.length === 0 && (
            <Text style={styles.empty}>
              Nenhum dia de culto cadastrado para este mês
            </Text>
          )}

          {days.map((d) => {
            const set = availabilityMap.get(d.id);
            const hasAny = (set?.size ?? 0) > 0;

            return (
              <View key={d.id} style={styles.dayCard}>
                <Text style={styles.dayText}>
                  {d.date.toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                </Text>

                <View style={styles.turnos}>
                  {d.turnos.map((t) => {
                    const active = set?.has(t);

                    return (
                      <Pressable
                        key={t}
                        disabled={!canEdit}
                        style={[
                          styles.turno,
                          active && styles.turnoActive,
                          !canEdit && styles.turnoDisabled,
                        ]}
                        onPress={() => toggle(d.id, t)}
                      >
                        <Text
                          style={[
                            styles.turnoText,
                            active && styles.turnoTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text
                  style={[
                    styles.feedback,
                    hasAny
                      ? styles.feedbackOk
                      : styles.feedbackEmpty,
                  ]}
                >
                  {hasAny
                    ? "Disponibilidade definida"
                    : "Nenhuma disponibilidade"}
                </Text>
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

  windowBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 12,
  },
  windowOpen: { backgroundColor: "#DCFCE7" },
  windowClosed: { backgroundColor: "#FEE2E2" },
  windowText: { fontWeight: "800", fontSize: 26 },

  empty: { fontSize: 13, color: "#6B7280" },

  dayCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  dayText: { fontWeight: "800", marginBottom: 8 },

  turnos: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },

  turno: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },

  turnoActive: {
    backgroundColor: "#DCFCE7",
  },

  turnoDisabled: {
    opacity: 0.5,
  },

  turnoText: { fontWeight: "800" },
  turnoTextActive: { color: "#166534" },

  feedback: {
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackOk: {
    color: "#16A34A",
  },
  feedbackEmpty: {
    color: "#9CA3AF",
  },
});
