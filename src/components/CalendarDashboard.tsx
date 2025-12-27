import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================
   TYPES
========================= */

export type CalendarServiceStatus =
  | "empty"
  | "draft"
  | "published"
  | "partial";

export type CalendarDayData = {
  date: Date;
  serviceDayId: string;
  services: {
    turno: string;
    ministry: string;
    status: CalendarServiceStatus;
    people?: {
      id?: string;
      name: string;
      role: string;
    }[];
  }[];
};

type Props = {
  month: Date;
  data: CalendarDayData[];
  onDayPress?: (day: CalendarDayData) => void;
};

/* =========================
   HELPERS
========================= */

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

function getCalendarMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const days: (Date | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

/**
 * Status consolidado do dia
 */
function getDayStatus(
  services: CalendarDayData["services"]
): CalendarServiceStatus {
  const total = services.length;
  const published = services.filter(
    (s) => s.status === "published"
  ).length;
  const draft = services.filter(
    (s) => s.status === "draft"
  ).length;

  if (total > 0 && published === total) return "published";
  if (published > 0) return "partial";
  if (draft > 0) return "draft";
  return "empty";
}

/* =========================
   COMPONENT
========================= */

export function CalendarDashboard({
  month,
  data,
  onDayPress,
}: Props) {
  const [selectedDay, setSelectedDay] =
    useState<CalendarDayData | null>(null);

  const matrix = useMemo(
    () =>
      getCalendarMatrix(
        month.getFullYear(),
        month.getMonth()
      ),
    [month]
  );

  function handlePress(day: CalendarDayData) {
    if (onDayPress) onDayPress(day);
    else setSelectedDay(day);
  }

  return (
    <View>
      {/* WEEK DAYS */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <Text key={i} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      {/* CALENDAR */}
      <View style={styles.calendar}>
        {matrix.map((date, index) => {
          if (!date)
            return <View key={index} style={styles.empty} />;

          const dayData = data.find((d) =>
            isSameDay(d.date, date)
          );

          const status = dayData
            ? getDayStatus(dayData.services)
            : "empty";

          return (
            <Pressable
              key={date.toISOString()}
              style={[
                styles.dayCell,
                isToday(date) && styles.today,
              ]}
              onPress={() => dayData && handlePress(dayData)}
            >
              <Text style={styles.dayNumber}>
                {date.getDate()}
              </Text>

              {/* 1 culto → dot */}
              {dayData &&
                dayData.services.length === 1 && (
                  <View
                    style={[
                      styles.dot,
                      status === "published"
                        ? styles.dotPublished
                        : status === "partial"
                          ? styles.dotPartial
                          : status === "draft"
                            ? styles.dotDraft
                            : styles.dotEmpty,
                    ]}
                  />
                )}

              {/* 2+ cultos → badge */}
              {dayData &&
                dayData.services.length > 1 && (
                  <View
                    style={[
                      styles.badge,
                      status === "published"
                        ? styles.badgePublished
                        : status === "partial"
                          ? styles.badgePartial
                          : status === "draft"
                            ? styles.badgeDraft
                            : styles.badgeEmpty,
                    ]}
                  >
                  </View>
                )}
            </Pressable>
          );
        })}
      </View>

      {/* MODAL (fallback quando não vem onDayPress) */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {selectedDay?.date.toLocaleDateString(
                  "pt-BR",
                  {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  }
                )}
              </Text>

              {selectedDay?.services.map((s, i) => (
                <View key={i} style={styles.service}>
                  {/* Ministério */}
                  <Text style={styles.serviceTitle}>
                    {s.ministry} - {s.turno}
                  </Text>
                  {/* STATUS — só se NÃO estiver publicado */}
                  {s.status !== "published" && (
                    <Text style={styles.serviceStatus}>
                      {s.status === "draft"
                        ? "📝 Escala em rascunho"
                        : "⚠️ Sem escala"}
                    </Text>
                  )}
                  {/* PESSOAS ESCALADAS */}
                  {s.people && s.people.length > 0 ? (
                    s.people.map((p, idx) => (
                      <Text key={idx} style={styles.person}>
                        • {p.name}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.noPeople}>
                      Nenhuma pessoa escalada
                    </Text>
                  )}
                </View>
              ))}

              <Pressable
                style={styles.close}
                onPress={() => setSelectedDay(null)}
              >
                <Text style={styles.closeText}>
                  Fechar
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  person: { fontWeight: "900"},
  weekRow: { flexDirection: "row", marginBottom: 8 },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    color: "#6B7280",
  },

  calendar: { flexDirection: "row", flexWrap: "wrap" },
  empty: { width: "14.2857%", aspectRatio: 1 },

  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginBottom: 10,
  },

  today: { borderColor: "#2563EB", borderWidth: 2 },
  dayNumber: { fontWeight: "800", marginBottom: 4 },

  dot: { width: 8, height: 8, borderRadius: 4 },
  dotPublished: { backgroundColor: "#22C55E" },
  dotDraft: { backgroundColor: "#F59E0B" },
  dotPartial: { backgroundColor: "#F97316" },
  dotEmpty: { backgroundColor: "#D1D5DB" },

  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  badgePublished: { backgroundColor: "#22C55E" },
  badgeDraft: { backgroundColor: "#F59E0B" },
  badgePartial: { backgroundColor: "#F97316" },
  badgeEmpty: { backgroundColor: "#9CA3AF" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  modal: { backgroundColor: "#FFF", padding: 20, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 , textTransform: "capitalize",},
  service: { marginBottom: 10 },
  serviceTitle: { fontWeight: "700" },
  serviceStatus: { fontSize: 13, color: "#6B7280" },

  close: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  closeText: { color: "#FFF", fontWeight: "800" },

  noPeople: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginLeft: 8,
    marginTop: 2,
  },

});
