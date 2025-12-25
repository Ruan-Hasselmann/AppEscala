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
  | "published";

export type CalendarDayData = {
  date: Date;
  serviceDayId: string;
  services: {
    label: string;
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
  const t = new Date();
  return isSameDay(date, t);
}

function getCalendarMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const days: (Date | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) {
    days.push(null);
  }

  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  return days;
}

function getDayStatus(
  services: CalendarDayData["services"]
): CalendarServiceStatus {
  if (services.some(s => s.status === "published")) {
    return "published";
  }
  if (services.some(s => s.status === "draft")) {
    return "draft";
  }
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
    if (onDayPress) {
      onDayPress(day);
    } else {
      setSelectedDay(day);
    }
  }

  return (
    <View>
      {/* WEEK DAYS */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, index) => (
          <Text key={`${d}-${index}`} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      {/* CALENDAR */}
      <View style={styles.calendar}>
        {matrix.map((date, index) => {
          if (!date) {
            return <View key={index} style={styles.empty} />;
          }

          const dayData = data.find((d) =>
            isSameDay(d.date, date)
          );

          const status = dayData
            ? getDayStatus(dayData.services)
            : null;

          return (
            <Pressable
              key={date.toISOString()}
              style={[
                styles.dayCell,
                isToday(date) && styles.today,
              ]}
              onPress={() => {
                if (dayData) {
                  handlePress(dayData);
                } else if (onDayPress) {
                  onDayPress({
                    date,
                    services: [],
                    serviceDayId: ""
                  });
                }
              }}
            >
              <Text style={styles.dayNumber}>
                {date.getDate()}
              </Text>

              {dayData && dayData.services.length === 1 && (
                <View
                  style={[
                    styles.dot,
                    status === "published"
                      ? styles.dotPublished
                      : status === "draft"
                        ? styles.dotDraft
                        : styles.dotEmpty,
                  ]}
                />
              )}

              {dayData && dayData.services.length > 1 && (
                <View
                  style={[
                    styles.badge,
                    status === "published"
                      ? styles.badgePublished
                      : status === "draft"
                        ? styles.badgeDraft
                        : styles.badgeEmpty,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {dayData.services.length}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* MODAL PADRÃO */}
      <Modal
        visible={!!selectedDay}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {selectedDay?.date.toLocaleDateString(
                  "pt-BR",
                  {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                  }
                )}
              </Text>

              {selectedDay?.services.map((s, i) => (
                <View key={i} style={styles.service}>
                  <Text style={styles.serviceTitle}>
                    {s.label} —{" "}
                    {s.status === "published"
                      ? "✅ Publicada"
                      : s.status === "draft"
                        ? "📝 Rascunho"
                        : "⚠️ Sem escala"}
                  </Text>

                  {s.people && s.people.length > 0 ? (
                    s.people.map((p, idx) => (
                      <Text key={idx} style={styles.person}>
                        • {p.name} — {p.role}
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
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    color: "#6B7280",
  },

  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  empty: {
    width: "14.2857%",
    aspectRatio: 1,
  },

  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },

  today: {
    borderColor: "#2563EB",
    borderWidth: 2,
  },

  dayNumber: {
    fontWeight: "700",
    marginBottom: 4,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotPublished: {
    backgroundColor: "#22C55E",
  },
  dotDraft: {
    backgroundColor: "#F59E0B",
  },
  dotPending: {
    backgroundColor: "#EF4444",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  service: {
    marginBottom: 12,
  },
  serviceTitle: {
    fontWeight: "700",
  },
  close: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  person: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
    marginTop: 2,
  },
  noPeople: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginLeft: 8,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dotEmpty: {
    backgroundColor: "#D1D5DB", // cinza
  },

  badgePublished: {
    backgroundColor: "#22C55E", // verde
  },

  badgeDraft: {
    backgroundColor: "#F59E0B", // amarelo
  },

  badgeEmpty: {
    backgroundColor: "#9CA3AF", // cinza
  },

});
