import { useEffect, useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import { listLeaderPeople } from "../../../src/services/leader";
import {
    finalizeLeaderSchedule,
    getLeaderSchedule,
    ScheduleSlot,
    updateLeaderSchedule,
} from "../../../src/services/leaderSchedule";
import { getMonthKey, getMonthName } from "../../../src/utils/calendar";

/* =========================
   HELPERS
========================= */

function getNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/* =========================
   COMPONENT
========================= */

export default function LeaderReviewSchedule() {
  const { user } = useAuth();
  if (!user || user.role !== "leader") return null;

  const uid = user.uid;
  const ministryId = user.ministryIds?.[0];
  if (!ministryId) return null;

  const target = useMemo(() => getNextMonth(), []);
  const monthKey = getMonthKey(target);
  const monthLabel = getMonthName(target.getFullYear(), target.getMonth());

  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<"draft" | "final">("draft");
  const [loading, setLoading] = useState(true);

  /* =========================
     LOAD
  ========================= */

  useEffect(() => {
    async function load() {
      const schedule = await getLeaderSchedule(ministryId, monthKey);
      if (!schedule) {
        setLoading(false);
        return;
      }

      setSlots(schedule.slots);
      setStatus(schedule.status);

      const p = await listLeaderPeople(ministryId);
      setPeople(p.map((x) => ({ id: x.person.id, name: x.person.name })));

      setLoading(false);
    }

    load();
  }, [ministryId, monthKey]);

  /* =========================
     HANDLERS
  ========================= */

  function changePerson(index: number) {
    const next = people[(index + 1) % people.length];
    setSlots((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, personId: next.id } : s
      )
    );
  }

  async function save() {
    await updateLeaderSchedule(ministryId, monthKey, slots);
    alert("Escala salva");
  }

  async function finalize() {
    await finalizeLeaderSchedule(ministryId, monthKey);
    setStatus("final");
    alert("Escala finalizada");
  }

  /* =========================
     RENDER
  ========================= */

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Carregando…</Text>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.container}>
        <Text>Nenhuma escala encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Revisar Escala</Text>
      <Text style={styles.subtitle}>
        {monthLabel} • {status === "final" ? "Finalizada" : "Rascunho"}
      </Text>

      {slots.map((slot, index) => {
        const person = people.find((p) => p.id === slot.personId);

        return (
          <View key={`${slot.date}-${slot.turn}`} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.date}>{slot.date}</Text>
              <Text style={styles.turn}>
                {slot.turn === "morning" ? "Manhã" : "Noite"}
              </Text>
              <Text style={styles.person}>
                {person?.name ?? "—"}
              </Text>
            </View>

            {status === "draft" && (
              <TouchableOpacity
                style={styles.swap}
                onPress={() => changePerson(index)}
              >
                <Text style={styles.swapText}>Trocar</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {status === "draft" && (
        <>
          <TouchableOpacity style={styles.save} onPress={save}>
            <Text style={styles.saveText}>Salvar ajustes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.final}
            onPress={finalize}
          >
            <Text style={styles.finalText}>Finalizar escala</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },

  title: { fontSize: 22, fontWeight: "900" },
  subtitle: {
    color: "#374151",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  date: { fontWeight: "800" },
  turn: { color: "#374151", marginTop: 2 },
  person: {
    marginTop: 6,
    fontWeight: "900",
    color: "#1E3A8A",
  },

  swap: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  swapText: { fontWeight: "800" },

  save: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  saveText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  final: {
    backgroundColor: "#065F46",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 10,
  },
  finalText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },
});
