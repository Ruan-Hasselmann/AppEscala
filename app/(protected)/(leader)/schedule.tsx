import { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import { generateLeaderSchedule } from "../../../src/services/leaderSchedule";
import { getMonthName } from "../../../src/utils/calendar";

function getNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default function LeaderSchedule() {
  const { user } = useAuth();
  if (!user || user.role !== "leader") return null;
  const uid = user.uid;

  // 🔹 por enquanto assume 1 ministério
  const ministryId = user.ministryIds?.[0];

  const target = useMemo(() => getNextMonth(), []);
  const year = target.getFullYear();
  const month = target.getMonth();

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleGenerate() {
    if (!ministryId) return;

    try {
      setLoading(true);
      await generateLeaderSchedule(ministryId, uid, year, month);
      setDone(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerar escala</Text>
      <Text style={styles.subtitle}>
        Mês de {getMonthName(year, month)}
      </Text>

      {!done ? (
        <TouchableOpacity
          style={styles.primary}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={styles.primaryText}>
            {loading ? "Gerando…" : "Gerar escala do ministério"}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.success}>
          ✅ Escala gerada com sucesso
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "900" },
  subtitle: { marginBottom: 20, color: "#374151" },

  primary: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  success: {
    marginTop: 20,
    color: "#065F46",
    fontWeight: "800",
  },
});
