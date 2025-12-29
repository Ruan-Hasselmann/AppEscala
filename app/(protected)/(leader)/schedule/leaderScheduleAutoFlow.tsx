import { useEffect, useMemo, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listMinistriesByIds, Ministry } from "@/src/services/ministries";
import {
    listLeaderMinistryIds,
    listPeopleByIds,
    Person,
} from "@/src/services/people";
import { getServiceDaysByMonth } from "@/src/services/serviceDays";

import {
    listSchedulesByMonth,
    publishSchedulesByMonth,
    replaceScheduleAssignment,
    revertSchedulesToDraftByMonth,
    Schedule,
} from "@/src/services/schedules";

import { loadAutoScheduleData } from "@/src/services/scheduleAutoData";
import { generateAndSaveSchedule } from "@/src/services/scheduleAutomation";

import { ConfirmActionModal } from "@/src/components/ConfirmActionModal";
import { EditScheduleAssignmentModal } from "@/src/components/EditScheduleAssignmentModal";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

/* =========================
   CONSTANTS
========================= */

const SERVICE_LABEL_ORDER: Record<string, number> = {
  Manhã: 1,
  Tarde: 2,
  Noite: 3,
};

/* =========================
   TYPES
========================= */

type GroupedDay = {
  serviceDayId: string;
  date: string;
  sortDate: Date;
  items: Schedule[];
};

type GroupedByMinistry = Record<
  string,
  {
    ministry: Ministry;
    days: GroupedDay[];
    status: "draft" | "published";
  }
>;

/* =========================
   SCREEN
========================= */

export default function LeaderScheduleAutoFlow() {
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [serviceDayIds, setServiceDayIds] = useState<string[]>([]);
  const [peopleMap, setPeopleMap] = useState<Record<string, Person>>({});
  const [serviceDayDateMap, setServiceDayDateMap] = useState<
    Record<string, Date>
  >({});

  const [confirmPublishMinistry, setConfirmPublishMinistry] =
    useState<string | null>(null);
  const [confirmRevertMinistry, setConfirmRevertMinistry] =
    useState<string | null>(null);

  const [editingSchedule, setEditingSchedule] =
    useState<Schedule | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // ✅ ADICIONADO: sugestão automática pro turno aberto no modal
  const [suggestedPersonId, setSuggestedPersonId] = useState<string | null>(
    null
  );

  /* =========================
     MONTH (NEXT)
  ========================= */

  const reviewMonthDate = useMemo(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth() + 1, 1);
  }, []);

  const monthLabel = useMemo(() => {
    return reviewMonthDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [reviewMonthDate]);

  function getPersonName(personId: string) {
    return peopleMap[personId]?.name ?? personId;
  }

  function getPeopleByMinistry(ministryId: string): Person[] {
    return Object.values(peopleMap).filter((p) =>
      p.ministryIds?.includes(ministryId)
    );
  }

  /* =========================
     DERIVED STATE
  ========================= */

  const hasDraftSchedules = useMemo(
    () => schedules.some((s) => s.status === "draft"),
    [schedules]
  );

  /* =========================
     LOAD REVIEW DATA
  ========================= */

  async function loadReviewData() {
    if (!user) return;

    const ministryIds = await listLeaderMinistryIds(user.personId);
    if (ministryIds.length === 0) {
      setError("Você não lidera nenhum ministério");
      return;
    }

    const ministriesData = await listMinistriesByIds(ministryIds);
    setMinistries(ministriesData);

    const serviceDays = await getServiceDaysByMonth(reviewMonthDate);
    const ids = serviceDays.map((d) => d.id);
    setServiceDayIds(ids);

    const dateMap: Record<string, Date> = {};
    serviceDays.forEach((d) => (dateMap[d.id] = d.date));
    setServiceDayDateMap(dateMap);

    const allSchedules: Schedule[] = [];
    for (const ministryId of ministryIds) {
      const res = await listSchedulesByMonth({
        ministryId,
        serviceDayIds: ids,
      });
      allSchedules.push(...res);
    }
    setSchedules(allSchedules);

    const personIds = Array.from(
      new Set(
        allSchedules.flatMap((s) => s.assignments.map((a) => a.personId))
      )
    );

    if (personIds.length > 0) {
      const people = await listPeopleByIds(personIds);
      const map: Record<string, Person> = {};
      people.forEach((p) => (map[p.id] = p));
      setPeopleMap(map);
    } else {
      setPeopleMap({});
    }
  }

  useEffect(() => {
    loadReviewData();
  }, [user, reviewMonthDate]);

  /* =========================
     GENERATE / REGENERATE
  ========================= */

  async function handleGenerate() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const target = reviewMonthDate;
      const month = target.getMonth();
      const year = target.getFullYear();

      const ministryIds = await listLeaderMinistryIds(user.personId);
      if (ministryIds.length === 0) {
        throw new Error("Você não lidera nenhum ministério");
      }

      for (const ministryId of ministryIds) {
        const { members, serviceDays, availability } =
          await loadAutoScheduleData({
            ministryId,
            month,
            year,
          });

        if (members.length === 0 || serviceDays.length === 0) continue;

        await generateAndSaveSchedule({
          ministryId,
          members,
          serviceDays,
          availability,
          generatedBy: user.personId,
          replaceDrafts: true,
        });
      }

      await loadReviewData();
    } catch (e: any) {
      setError(e?.message ?? "Erro ao gerar escala");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     REPLACE PERSON (VALIDATED)
  ========================= */

  function hasConflict(params: {
    serviceDayId: string;
    newPersonId: string;
    currentScheduleId: string;
  }) {
    const { serviceDayId, newPersonId, currentScheduleId } = params;

    return schedules.some(
      (s) =>
        s.serviceDayId === serviceDayId &&
        s.id !== currentScheduleId &&
        s.assignments.some((a) => a.personId === newPersonId)
    );
  }

  async function handleReplacePerson(newPersonId: string) {
    if (!editingSchedule || !user) return;

    const oldPersonId = editingSchedule.assignments[0]?.personId;

    if (!oldPersonId || oldPersonId === newPersonId) {
      setEditingSchedule(null);
      setSuggestedPersonId(null); // ✅ ADICIONADO
      return;
    }

    const conflict = hasConflict({
      serviceDayId: editingSchedule.serviceDayId,
      newPersonId,
      currentScheduleId: editingSchedule.id,
    });

    if (conflict) {
      setEditError("Essa pessoa já está escalada em outro turno neste dia.");
      return;
    }

    await replaceScheduleAssignment({
      scheduleId: editingSchedule.id,
      oldPersonId,
      newPersonId,
      performedBy: user.personId,
    });

    setEditError(null);
    setEditingSchedule(null);
    setSuggestedPersonId(null); // ✅ ADICIONADO
    await loadReviewData();
  }

  /* =========================
     ✅ SUGESTÃO AUTOMÁTICA
  ========================= */

  function getScheduleCountInMonth(personId: string) {
    let count = 0;
    schedules.forEach((s) => {
      if (s.assignments?.some((a) => a.personId === personId)) count++;
    });
    return count;
  }

  function getBestReplacementPersonId(schedule: Schedule): string | null {
    const ministryPeople = getPeopleByMinistry(schedule.ministryId);
    if (ministryPeople.length === 0) return null;

    const currentPersonId = schedule.assignments?.[0]?.personId;

    // pessoas ocupadas no mesmo dia (qualquer turno)
    const busy = new Set<string>();
    schedules
      .filter((s) => s.serviceDayId === schedule.serviceDayId)
      .forEach((s) => {
        s.assignments?.forEach((a) => busy.add(a.personId));
      });

    // candidatos: do ministério, não ocupado no dia, não é o atual
    const candidates = ministryPeople
      .filter((p) => p.id !== currentPersonId)
      .filter((p) => !busy.has(p.id));

    if (candidates.length === 0) return null;

    // menor número de escalas no mês
    candidates.sort((a, b) => {
      const ca = getScheduleCountInMonth(a.id);
      const cb = getScheduleCountInMonth(b.id);
      return ca - cb;
    });

    return candidates[0].id;
  }

  function handleSuggestBest() {
    if (!editingSchedule) return;

    const best = getBestReplacementPersonId(editingSchedule);
    setSuggestedPersonId(best);

    if (!best) {
      setEditError(
        "Não encontrei um substituto disponível (todos já estão escalados neste dia)."
      );
      return;
    }

    // opcional: já seleciona sem erro
    setEditError(null);
  }

  /* =========================
     GROUPING + SORT
  ========================= */

  const grouped = useMemo<GroupedByMinistry>(() => {
    const map: GroupedByMinistry = {};

    schedules.forEach((s) => {
      if (!map[s.ministryId]) {
        const ministry = ministries.find((m) => m.id === s.ministryId);
        if (!ministry) return;

        map[s.ministryId] = {
          ministry,
          days: [],
          status: s.status,
        };
      }

      let day = map[s.ministryId].days.find((d) => d.serviceDayId === s.serviceDayId);

      if (!day) {
        day = {
          serviceDayId: s.serviceDayId,
          date: s.serviceDate,
          sortDate: serviceDayDateMap[s.serviceDayId] ?? new Date(0),
          items: [],
        };
        map[s.ministryId].days.push(day);
      }

      day.items.push(s);
    });

    Object.values(map).forEach((group) => {
      group.days.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

      group.days.forEach((day) => {
        day.items.sort((a, b) => {
          const orderA = SERVICE_LABEL_ORDER[a.serviceLabel] ?? 99;
          const orderB = SERVICE_LABEL_ORDER[b.serviceLabel] ?? 99;
          return orderA - orderB;
        });
      });
    });

    return map;
  }, [schedules, ministries, serviceDayDateMap]);

  /* =========================
     CONFIRM ACTIONS
  ========================= */

  async function confirmPublish() {
    if (!confirmPublishMinistry) return;
    await publishSchedulesByMonth({
      ministryId: confirmPublishMinistry,
      serviceDayIds,
    });
    await loadReviewData();
    setConfirmPublishMinistry(null);
  }

  async function confirmRevert() {
    if (!confirmRevertMinistry) return;
    await revertSchedulesToDraftByMonth({
      ministryId: confirmRevertMinistry,
      serviceDayIds,
    });
    await loadReviewData();
    setConfirmRevertMinistry(null);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader title="Escala automática" subtitle={`Mês: ${monthLabel}`} />

      <View style={styles.container}>
        <Pressable
          style={[styles.generateBtn, loading && styles.disabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <Text style={styles.generateText}>
            {loading
              ? "Gerando escalas..."
              : hasDraftSchedules
              ? "Regerar escala do mês"
              : "Gerar escala automaticamente"}
          </Text>
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}

        {(hasDraftSchedules || schedules.length > 0) && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: tabBarHeight }}
          >
            {Object.values(grouped).map(({ ministry, days, status }) => (
              <View key={ministry.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.ministryTitle}>{ministry.name}</Text>

                  <Text
                    style={[
                      styles.status,
                      status === "published" ? styles.published : styles.draft,
                    ]}
                  >
                    {status === "published" ? "Publicado" : "Rascunho"}
                  </Text>
                </View>

                {days.map((day) => (
                  <View key={day.serviceDayId} style={styles.dayBlock}>
                    <Text style={styles.dayTitle}>{day.date}</Text>

                    {day.items.map((item) => (
                      <Pressable
                        key={item.id}
                        style={styles.turnRow}
                        onPress={() => {
                          if (item.status === "published") return;
                          setEditError(null);
                          setSuggestedPersonId(null); // ✅ ADICIONADO
                          setEditingSchedule(item);
                        }}
                      >
                        <Text style={styles.turn}>
                          • {item.serviceLabel} —{" "}
                          {item.assignments
                            .map((a) => getPersonName(a.personId))
                            .join(", ")}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))}

                {status === "draft" ? (
                  <Pressable
                    style={styles.publishBtn}
                    onPress={() => setConfirmPublishMinistry(ministry.id)}
                  >
                    <Text style={styles.publishText}>Publicar escala do mês</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.revertBtn}
                    onPress={() => setConfirmRevertMinistry(ministry.id)}
                  >
                    <Text style={styles.revertText}>Voltar para rascunho</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* MODAIS */}
      <ConfirmActionModal
        visible={!!confirmPublishMinistry}
        title="Publicar escala"
        message="Essa ação publicará todas as escalas do mês e notificará os membros. Deseja continuar?"
        confirmText="Publicar"
        onCancel={() => setConfirmPublishMinistry(null)}
        onConfirm={confirmPublish}
      />

      <ConfirmActionModal
        visible={!!confirmRevertMinistry}
        title="Voltar para rascunho"
        message="Essa ação removerá a escala publicada e permitirá edição novamente. Deseja continuar?"
        confirmText="Confirmar"
        destructive
        onCancel={() => setConfirmRevertMinistry(null)}
        onConfirm={confirmRevert}
      />

      <EditScheduleAssignmentModal
        visible={!!editingSchedule}
        scheduleLabel={editingSchedule?.serviceLabel ?? ""}
        people={editingSchedule ? getPeopleByMinistry(editingSchedule.ministryId) : []}
        currentPersonId={editingSchedule?.assignments[0]?.personId ?? ""}
        // ✅ ADICIONADO: sugestão automática pro modal
        suggestedPersonId={suggestedPersonId}
        // ✅ ADICIONADO: ação para calcular sugestão (se o modal suportar)
        onSuggestBest={handleSuggestBest}
        error={editError}
        onCancel={() => {
          setEditError(null);
          setSuggestedPersonId(null); // ✅ ADICIONADO
          setEditingSchedule(null);
        }}
        onConfirm={handleReplacePerson}
      />
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  generateBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  disabled: {
    opacity: 0.6,
  },
  generateText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 16,
  },
  error: {
    color: "#DC2626",
    fontWeight: "800",
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ministryTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  status: {
    fontSize: 12,
    fontWeight: "800",
  },
  draft: {
    color: "#B45309",
  },
  published: {
    color: "#16A34A",
  },
  dayBlock: {
    marginTop: 8,
  },
  dayTitle: {
    fontWeight: "800",
    marginBottom: 4,
  },
  turn: {
    marginLeft: 8,
    color: "#374151",
  },
  publishBtn: {
    marginTop: 12,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  publishText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  revertBtn: {
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  revertText: {
    color: "#DC2626",
    fontWeight: "900",
  },
  turnRow: {
    paddingVertical: 4,
  },
});
