import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";

import { buildScheduleInput } from "@/src/services/schedule/adapters/buildScheduleInput";
import { loadScheduleDataFromFirestore } from "@/src/services/schedule/adapters/loadScheduleData";
import { loadScheduleSlots } from "@/src/services/schedule/adapters/loadScheduleSlots";
import { generateScheduleForMinistries } from "@/src/services/schedule/generateScheduleForMinistries";
import {
  loadSavedSchedule,
  SavedScheduleItem,
} from "@/src/services/schedule/loadSavedSchedule";
import { saveSchedule } from "@/src/services/schedule/saveSchedule";
import { formatDateBR, parseLocalDate } from "@/src/utils/dates";

/* =========================
   CONSTANTES
========================= */

const COLORS = {
  accent: "#2563EB",
  success: "#065F46",
  muted: "#6B7280",
  border: "#E5E7EB",
  today: "#F59E0B",
};

/* =========================
   TYPES
========================= */

type PreviewItem = {
  date: string;
  slot: "morning" | "night";
  ministryId: string;
  ministryName: string;
  role: string;
  personId: string;
  personName: string;
};

type CalendarDay = {
  date: string;
  hasMorning: boolean;
  hasNight: boolean;
};

/* =========================
   COMPONENT
========================= */

export default function LeaderSchedulePreview() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [items, setItems] = useState<PreviewItem[]>([]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [savedItems, setSavedItems] = useState<SavedScheduleItem[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [editingItem, setEditingItem] =
    useState<SavedScheduleItem | null>(null);

  const [eligiblePeople, setEligiblePeople] = useState<
    { id: string; name: string }[]
  >([]);

  const [confirmVisible, setConfirmVisible] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  /* =========================
     🔹 CARREGAMENTO INICIAL
     (escala já existente)
  ========================= */

  useEffect(() => {
    loadInitialSchedules();
  }, []);

  async function loadInitialSchedules() {
    setLoadingSaved(true);

    try {
      const slots = await loadScheduleSlots(currentMonth);

      const calendarMap: Record<string, CalendarDay> = {};

      for (const slot of slots) {
        const saved = await loadSavedSchedule(
          currentMonth,
          slot.date
        );

        if (saved.length === 0) continue;

        calendarMap[slot.date] ??= {
          date: slot.date,
          hasMorning: false,
          hasNight: false,
        };

        if (slot.slot === "morning") {
          calendarMap[slot.date].hasMorning = true;
        }

        if (slot.slot === "night") {
          calendarMap[slot.date].hasNight = true;
        }
      }

      setCalendarDays(Object.values(calendarMap));
    } finally {
      setLoadingSaved(false);
    }
  }

  /* =========================
     GERAR ESCALA (PREVIEW)
  ========================= */

  async function handleGenerate() {
    if (generated) return;

    setLoading(true);

    try {
      const { ministries, people, memberships } =
        await loadScheduleDataFromFirestore();

      const slots = await loadScheduleSlots(currentMonth);

      const { slotsInput } = buildScheduleInput({
        ministries,
        people,
        memberships,
        slots,
      });

      const results: PreviewItem[] = [];

      for (const slotItem of slotsInput) {
        const r = generateScheduleForMinistries({
          dates: [slotItem.slot.key],
          ministries: slotItem.ministriesInput,
        });

        r.forEach((item) =>
          results.push({
            date: slotItem.slot.date,
            slot: slotItem.slot.slot,
            ministryId: item.ministryId,
            ministryName: item.ministryName,
            role: item.role,
            personId: item.personId,
            personName: item.personName,
          })
        );
      }

      const map: Record<string, CalendarDay> = {};
      results.forEach((i) => {
        map[i.date] ??= {
          date: i.date,
          hasMorning: false,
          hasNight: false,
        };
        if (i.slot === "morning") map[i.date].hasMorning = true;
        if (i.slot === "night") map[i.date].hasNight = true;
      });

      setItems(results);
      setCalendarDays(Object.values(map));
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     CLIQUE NO DIA
  ========================= */

  async function handleDayPress(date: string) {
    setSelectedDate(null);
    setShowSaved(false);
    setSavedItems([]);
    setLoadingSaved(true);

    const saved = await loadSavedSchedule(currentMonth, date);

    if (saved.length > 0) {
      setSavedItems(saved);
      setShowSaved(true);
    } else {
      setSelectedDate(date);
    }

    setLoadingSaved(false);
  }

  /* =========================
     SALVAR ESCALA
  ========================= */

  async function handleConfirmSave() {
    if (!selectedDate || !user) return;

    try {
      setSaving(true);

      for (const slot of ["morning", "night"] as const) {
        const slotItems = items.filter(
          (i) => i.date === selectedDate && i.slot === slot
        );

        if (slotItems.length === 0) continue;

        await saveSchedule({
          month: currentMonth,
          date: selectedDate,
          slot,
          items: slotItems.map((i) => ({
            ministryId: i.ministryId,
            ministryName: i.ministryName,
            role: i.role,
            personId: i.personId,
            personName: i.personName,
          })),
          createdByUid: user.uid,
        });
      }

      setSelectedDate(null);
      setGenerated(false);
      await loadInitialSchedules(); // 🔁 atualiza calendário
    } finally {
      setSaving(false);
    }
  }

  /* =========================
     EDIÇÃO
  ========================= */

  async function loadEligiblePeople(item: SavedScheduleItem) {
    const { people, memberships } =
      await loadScheduleDataFromFirestore();

    const eligible = memberships
      .filter(
        (m) =>
          m.status === "active" &&
          m.ministryId === item.ministryId
      )
      .map((m) => {
        const p = people.find((x) => x.id === m.personId);
        return p ? { id: p.id, name: p.name } : null;
      })
      .filter(Boolean) as { id: string; name: string }[];

    setEligiblePeople(eligible);
  }

  async function applyEdit(
    item: SavedScheduleItem,
    person: { id: string; name: string }
  ) {
    if (!user) return;

    await saveSchedule({
      month: currentMonth,
      date: item.date,
      slot: item.slot,
      items: [
        {
          ministryId: item.ministryId,
          ministryName: item.ministryName,
          role: item.role,
          personId: person.id,
          personName: person.name,
        },
      ],
      createdByUid: user.uid,
    });

    const updated = await loadSavedSchedule(
      currentMonth,
      item.date
    );
    setSavedItems(updated);

    setEditingItem(null);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Escala do Ministério</Text>

      <TouchableOpacity
        onPress={handleGenerate}
        disabled={loading}
        style={styles.generateButton}
      >
        <Text style={styles.generateText}>
          {calendarDays.length > 0
            ? "Gerar nova escala"
            : "Gerar escala"}
        </Text>
      </TouchableOpacity>

      {/* CALENDÁRIO */}
      <View style={styles.calendar}>
        {calendarDays.map((day) => (
          <TouchableOpacity
            key={day.date}
            onPress={() => handleDayPress(day.date)}
            style={styles.calendarDay}
          >
            <View
              style={[
                styles.dayCircle,
                day.date === today && styles.dayToday,
              ]}
            >
              <Text style={styles.dayText}>
                {parseLocalDate(day.date).getDate()}
              </Text>
            </View>
            <Text style={styles.icons}>
              {day.hasMorning && "☀️"}
              {day.hasNight && "🌙"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ESCALA SALVA */}
      {showSaved && (
        <View style={styles.savedContainer}>
          <Text style={styles.savedTitle}>Escala salva</Text>

          {savedItems.map((i, idx) => (
            <View key={idx} style={styles.row}>
              <View>
                <Text style={styles.ministry}>
                  {i.ministryName}
                </Text>
                <Text style={styles.role}>{i.role}</Text>
              </View>

              <View style={styles.right}>
                <Text style={styles.person}>
                  {i.personName}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    setEditingItem(i);
                    await loadEligiblePeople(i);
                  }}
                >
                  <Text style={styles.edit}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* MODAL GERAR */}
      <Modal visible={!!selectedDate} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {selectedDate && formatDateBR(selectedDate)}
            </Text>

            <ScrollView>
              {items
                .filter((i) => i.date === selectedDate)
                .map((i, idx) => (
                  <View key={idx} style={styles.row}>
                    <Text>{i.ministryName}</Text>
                    <Text>{i.role}</Text>
                    <Text style={styles.person}>
                      {i.personName}
                    </Text>
                  </View>
                ))}
            </ScrollView>

            <TouchableOpacity
              onPress={handleConfirmSave}
              style={styles.saveButton}
            >
              <Text style={styles.saveText}>Salvar escala</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedDate(null)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL EDIÇÃO */}
      <Modal visible={!!editingItem} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Alterar pessoa
            </Text>

            <ScrollView>
              {eligiblePeople.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() =>
                    applyEdit(editingItem!, p)
                  }
                  style={styles.option}
                >
                  <Text>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setEditingItem(null)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "900", marginBottom: 12 },

  generateButton: {
    backgroundColor: COLORS.accent,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  generateText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "700",
  },

  calendar: { flexDirection: "row", flexWrap: "wrap" },
  calendarDay: {
    width: "14.28%",
    alignItems: "center",
    marginBottom: 10,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  dayToday: { borderWidth: 2, borderColor: COLORS.today },
  dayText: { color: "#FFF", fontWeight: "700" },
  icons: { fontSize: 10 },

  savedContainer: { marginTop: 24 },
  savedTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  ministry: { fontWeight: "800" },
  role: { fontSize: 12, color: COLORS.muted },
  person: { fontWeight: "900", color: COLORS.accent },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  edit: { fontSize: 16 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },

  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },

  saveButton: {
    backgroundColor: COLORS.success,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  saveText: {
    color: "#FFF",
    textAlign: "center",
    fontWeight: "700",
  },

  cancelButton: { marginTop: 12 },
  cancelText: {
    textAlign: "center",
    color: COLORS.accent,
    fontWeight: "700",
  },
});
