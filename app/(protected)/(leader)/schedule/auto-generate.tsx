import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistriesByIds } from "@/src/services/ministries";
import { listLeaderMinistryIds } from "@/src/services/people";

import { loadAutoScheduleData } from "@/src/services/scheduleAutoData";
import { generateAndSaveSchedule } from "@/src/services/scheduleAutomation";

import { useState } from "react";
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

type Member = {
  id: string;
  name: string;
};

type GeneratedResult = {
  schedules: any[];
  flags: string[];
  members: Member[];
};

type MinistryMap = Record<
  string,
  {
    id: string;
    name: string;
  }
>;

/* =========================
   SCREEN
========================= */

export default function AutoGenerateSchedule() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ministryMap, setMinistryMap] = useState<MinistryMap>({});

  /* =========================
     GERAR (PRÓXIMO MÊS)
  ========================= */

  async function handleGenerate() {
    if (!user) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      /* 🔹 próximo mês */
      const base = new Date();
      const target = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      const month = target.getMonth(); // 0–11
      const year = target.getFullYear();

      /* 🔹 ministérios do líder */
      const ministryIds = await listLeaderMinistryIds(user.personId);
      console.log("[AUTO] Ministérios do líder:", ministryIds);
      console.log("[AUTO] Período:", { month, year });

      if (ministryIds.length === 0) {
        throw new Error("Você não é líder de nenhum ministério");
      }

      /* 🔹 carregar nomes dos ministérios */
      const ministries = await listMinistriesByIds(ministryIds);
      const ministryMapTemp: MinistryMap = {};
      ministries.forEach((m) => (ministryMapTemp[m.id] = m));
      setMinistryMap(ministryMapTemp);

      const allSchedules: any[] = [];
      const allFlags: string[] = [];
      const allMembers: Member[] = [];

      for (const ministryId of ministryIds) {
        console.log("[AUTO] Gerando para ministério:", ministryId);

        const { members, serviceDays, availability } =
          await loadAutoScheduleData({
            ministryId,
            month,
            year,
          });

        console.log("[AUTO] Dados carregados:", {
          members: members.length,
          days: serviceDays.length,
        });

        if (serviceDays.length === 0 || members.length === 0) {
          console.warn(
            "[AUTO] Ignorando ministério sem dados:",
            ministryId
          );
          continue;
        }

        const res = await generateAndSaveSchedule({
          ministryId,
          members,
          serviceDays,
          availability,
          generatedBy: user.personId,
          replaceDrafts: true,
        });

        allSchedules.push(...res.schedules);
        allFlags.push(...(res.flags ?? []));

        members.forEach((m) => {
          if (!allMembers.some((x) => x.id === m.id)) {
            allMembers.push(m);
          }
        });

        console.log("[AUTO] Escalas geradas:", res.schedules.length);
      }

      setResult({
        schedules: allSchedules,
        flags: allFlags,
        members: allMembers,
      });
    } catch (e: any) {
      console.error("[AUTO] ERRO:", e);
      setError(e?.message ?? "Erro ao gerar escalas");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     HELPERS
  ========================= */

  function getPersonName(personId: string) {
    return (
      result?.members.find((m) => m.id === personId)?.name ?? personId
    );
  }

  function getMinistryName(ministryId: string) {
    return ministryMap[ministryId]?.name ?? ministryId;
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Geração Automática"
        subtitle="Sugestão inteligente de escalas"
      />

      <View style={styles.container}>
        <Pressable
          style={[styles.button, loading && styles.disabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processando..." : "Gerar escala automaticamente"}
          </Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <ScrollView
            style={styles.result}
            contentContainerStyle={{ paddingBottom: 200 }}
          >
            <Text style={styles.resultTitle}>
              Preview das escalas geradas
            </Text>

            {Object.entries(
              result.schedules.reduce((acc: any, s: any) => {
                if (!acc[s.ministryId]) acc[s.ministryId] = {};
                if (!acc[s.ministryId][s.serviceDayId]) {
                  acc[s.ministryId][s.serviceDayId] = {
                    date: s.serviceDate,
                    items: [],
                  };
                }
                acc[s.ministryId][s.serviceDayId].items.push(s);
                return acc;
              }, {})
            ).map(([ministryId, days]: any) => (
              <View key={ministryId} style={{ marginTop: 16 }}>
                <Text style={styles.ministryTitle}>
                  🏷 {getMinistryName(ministryId)}
                </Text>

                {Object.values(days).map((day: any, idx: number) => (
                  <View key={idx} style={styles.dayBlock}>
                    <Text style={styles.dayTitle}>📅 {day.date}</Text>

                    {day.items.map((item: any, i: number) => (
                      <View key={i} style={styles.turnRow}>
                        <Text style={styles.turnText}>
                          • {item.serviceLabel}
                        </Text>
                        <Text style={styles.personText}>
                          →{" "}
                          {getPersonName(
                            item.assignments[0].personId
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ))}

            {result.flags.length > 0 && (
              <Text style={styles.warning}>
                ⚠️ Atenções globais: {result.flags.join(", ")}
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  buttonText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
  },
  error: {
    color: "#DC2626",
    fontWeight: "800",
  },
  result: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
  },
  resultTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },
  ministryTitle: {
    fontWeight: "900",
    fontSize: 16,
    color: "#111827",
  },
  warning: {
    marginTop: 6,
    color: "#B45309",
    fontWeight: "800",
  },
  dayBlock: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  dayTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },
  turnRow: {
    marginLeft: 8,
    marginBottom: 4,
  },
  turnText: {
    fontWeight: "700",
  },
  personText: {
    marginLeft: 8,
    color: "#374151",
  },
});
