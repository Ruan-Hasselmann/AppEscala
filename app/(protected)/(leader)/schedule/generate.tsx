import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";

import { listAvailabilityByService } from "@/src/services/availabilities";
import { listMinistries, Ministry } from "@/src/services/ministries";
import { listPeople, Person } from "@/src/services/people";
import {
  getScheduleByService,
  listSchedulesByServiceDay,
  publishSchedule,
  saveScheduleDraft,
  Schedule,
} from "@/src/services/schedules";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/* =========================
   TYPES
========================= */

type AssignedPerson = {
  personId: string;
  ministryId: string;
};

type ConflictInfo = {
  status: "draft" | "published";
  ministryId: string;
  serviceLabel: string;
};

type PersonWithFlags = Person & {
  blocked?: boolean;
  warnDraftOtherMinistry?: boolean;
  warnOtherTurn?: boolean;
  warningsText?: string[];
};

/* =========================
   SCREEN
========================= */

export default function LeaderGenerateSchedule() {
  const { user, logout } = useAuth();

  const { serviceDayId, ministryId, name, date, serviceLabel } =
    useLocalSearchParams<{
      serviceDayId?: string;
      ministryId?: string;
      name?: string;
      date?: string;
      serviceLabel?: string;
    }>();

  const [people, setPeople] = useState<Person[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [assigned, setAssigned] = useState<AssignedPerson[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [scheduleStatus, setScheduleStatus] =
    useState<"draft" | "published" | "empty">("empty");
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [conflictsByPerson, setConflictsByPerson] = useState<
    Map<string, ConflictInfo[]>
  >(new Map());
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const safeServiceDayId = serviceDayId ?? "";
  const safeMinistryId = ministryId ?? "";
  const safeServiceLabel = (serviceLabel ?? "").trim();

  const isPublished = scheduleStatus === "published";
  const [availablePersonIds, setAvailablePersonIds] = useState<Set<string>>(
    new Set()
  );


  /* =========================
     LOAD
  ========================= */

  async function loadSchedule() {
    if (!safeServiceDayId || !safeMinistryId || !safeServiceLabel) return;

    const [
      p,
      m,
      existingThisTurn,
      allSameDay,
      availability,
    ] = await Promise.all([
      listPeople(),
      listMinistries(),
      getScheduleByService({
        serviceDayId: safeServiceDayId,
        ministryId: safeMinistryId,
        serviceLabel: safeServiceLabel,
      }),
      listSchedulesByServiceDay({ serviceDayId: safeServiceDayId }),
      listAvailabilityByService({
        serviceDayId: safeServiceDayId,
        serviceLabel: safeServiceLabel,
      }),
    ]);

    setAvailablePersonIds(
      new Set(availability.map((a) => a.personId))
    );

    setPeople(p.filter((x) => x.active));
    setMinistries(m.filter((x) => x.active));

    if (existingThisTurn) {
      setAssigned(existingThisTurn.assignments ?? []);
      setScheduleStatus(existingThisTurn.status);
    } else {
      setAssigned([]);
      setScheduleStatus("empty");
    }

    const map = new Map<string, ConflictInfo[]>();

    (allSameDay ?? []).forEach((s: Schedule) => {
      const info: ConflictInfo = {
        status: s.status,
        ministryId: s.ministryId,
        serviceLabel: s.serviceLabel,
      };

      (s.assignments ?? []).forEach((a) => {
        const prev = map.get(a.personId) ?? [];
        prev.push(info);
        map.set(a.personId, prev);
      });
    });

    setConflictsByPerson(map);
  }

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, [safeServiceDayId, safeMinistryId, safeServiceLabel])
  );

  const currentMinistry = useMemo(
    () => ministries.find((m) => m.id === safeMinistryId),
    [ministries, safeMinistryId]
  );

  /* =========================
     RULES
  ========================= */

  const assignedForThisTurn = useMemo(
    () =>
      (assigned ?? []).filter((x) => x.ministryId === safeMinistryId),
    [assigned, safeMinistryId]
  );

  const unavailablePersonIds = useMemo(
    () => assignedForThisTurn.map((a) => a.personId),
    [assignedForThisTurn]
  );

  function buildWarnings(personId: string) {
    const infos = conflictsByPerson.get(personId) ?? [];

    const relevant = infos.filter(
      (i) =>
        !(
          i.ministryId === safeMinistryId &&
          i.serviceLabel === safeServiceLabel
        )
    );

    let blocked = false;
    const warningsText: string[] = [];

    const otherMinistryPublished = relevant.some(
      (i) => i.ministryId !== safeMinistryId && i.status === "published"
    );
    const otherMinistryDraft = relevant.some(
      (i) => i.ministryId !== safeMinistryId && i.status === "draft"
    );

    if (otherMinistryPublished) blocked = true;
    else if (otherMinistryDraft)
      warningsText.push("⚠️ Em rascunho em outro ministério hoje");

    const otherTurn = relevant.some(
      (i) => i.serviceLabel !== safeServiceLabel
    );
    if (otherTurn)
      warningsText.push("ℹ️ Já escalado em outro turno hoje");

    return { blocked, warningsText };
  }

  function handleUserError(err: any) {
    if (!err?.message) {
      setErrorMessage("Ocorreu um erro inesperado.");
    } else if (err.message === "CONFLICT_SAME_TURN") {
      setErrorMessage(
        "Essa pessoa já está escalada neste mesmo turno em outro ministério."
      );
    } else {
      setErrorMessage("Não foi possível salvar a escala.");
    }

    setErrorModalVisible(true);
  }

  const availablePeople = useMemo(() => {
    if (!safeMinistryId) return [];

    const base = people
      // pertence ao ministério
      .filter((p) =>
        p.ministries.some((m) => m.ministryId === safeMinistryId)
      )
      // 🔥 marcou disponibilidade para o turno
      .filter((p) => availablePersonIds.has(p.id))
      // não está escalado neste turno ainda
      .filter((p) => !unavailablePersonIds.includes(p.id));

    const enriched: PersonWithFlags[] = base.map((p) => {
      const { blocked, warningsText } = buildWarnings(p.id);
      return {
        ...p,
        blocked,
        warningsText,
        warnDraftOtherMinistry: warningsText.some((t) =>
          t.includes("rascunho")
        ),
        warnOtherTurn: warningsText.some((t) =>
          t.includes("outro turno")
        ),
      };
    });

    return enriched
      .filter((p) => !p.blocked)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [
    people,
    safeMinistryId,
    unavailablePersonIds,
    conflictsByPerson,
    availablePersonIds,
  ]);

  /* =========================
     ACTIONS
  ========================= */

  function assignPerson(person: Person) {
    if (isPublished || !safeMinistryId) return;

    setAssigned((prev) => [
      ...(prev ?? []),
      { personId: person.id, ministryId: safeMinistryId },
    ]);
  }

  function removePerson(personId: string) {
    if (isPublished) return;

    setAssigned((prev) =>
      (prev ?? []).filter((x) => x.personId !== personId)
    );
  }

  async function handleSaveDraft() {
    if (
      isPublished ||
      !user ||
      !safeServiceDayId ||
      !safeMinistryId ||
      !safeServiceLabel ||
      !date
    )
      return;

    try {
      await saveScheduleDraft({
        ministryId: safeMinistryId,
        serviceDayId: safeServiceDayId,
        serviceLabel: safeServiceLabel,
        serviceDate: date,
        assignments: assignedForThisTurn,
        createdBy: user.personId,
      });

      setScheduleStatus("draft");
      setShowSavedModal(true);
      await loadSchedule();
    } catch (err) {
      handleUserError(err);
    }
  }

  async function handlePublish() {
    if (!safeServiceDayId || !safeMinistryId || !safeServiceLabel) return;

    await publishSchedule({
      ministryId: safeMinistryId,
      serviceDayId: safeServiceDayId,
      serviceLabel: safeServiceLabel,
    });

    setScheduleStatus("published");
    setShowPublishModal(false);

    router.push({ pathname: "/(protected)/(leader)/schedule" });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title={currentMinistry?.name ?? "Escala"}
        subtitle={`${name ?? ""} · Líder`}
        onLogout={logout}
      />

      <ScrollView>
        <View style={styles.container}>
          <Text style={styles.sectionInfo}>
            Escala para: {safeServiceLabel} {date}
          </Text>

          <View
            style={[
              styles.statusBadge,
              scheduleStatus === "published" && styles.statusPublished,
              scheduleStatus === "draft" && styles.statusDraft,
              scheduleStatus === "empty" && styles.statusEmpty,
            ]}
          >
            <Text style={styles.statusText}>
              {scheduleStatus === "published"
                ? "Escala publicada"
                : scheduleStatus === "draft"
                  ? "Rascunho"
                  : "Nenhuma escala criada"}
            </Text>
          </View>

          {isPublished && (
            <View style={styles.lockedInfo}>
              <Text style={styles.lockedText}>
                🔒 Esta escala está publicada e não pode ser editada
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Pessoas escaladas</Text>

          {assignedForThisTurn.length === 0 ? (
            <Text style={styles.empty}>Nenhuma pessoa escalada ainda</Text>
          ) : (
            assignedForThisTurn.map((a) => {
              const person = people.find((p) => p.id === a.personId);
              if (!person) return null;

              return (
                <View key={a.personId} style={styles.card}>
                  <Text style={styles.name}>{person.name}</Text>
                  {!isPublished && (
                    <Pressable onPress={() => removePerson(person.id)}>
                      <Text style={styles.remove}>Remover</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}

          {!isPublished && (
            <Pressable style={styles.saveBtn} onPress={handleSaveDraft}>
              <Text style={styles.saveText}>Salvar como rascunho</Text>
            </Pressable>
          )}

          {scheduleStatus === "draft" && (
            <Pressable
              style={styles.publishBtn}
              onPress={() => setShowPublishModal(true)}
            >
              <Text style={styles.publishText}>Publicar escala</Text>
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>Pessoas disponíveis</Text>

          {!isPublished &&
            availablePeople.map((p) => (
              <Pressable
                key={p.id}
                style={styles.card}
                onPress={() => assignPerson(p)}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.name}>{p.name}</Text>

                  {p.warningsText && p.warningsText.length > 0 && (
                    <View style={{ marginTop: 6 }}>
                      {p.warningsText.map((w, idx) => (
                        <Text key={idx} style={styles.warning}>
                          {w}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                <Text style={styles.add}>Adicionar</Text>
              </Pressable>
            ))}
        </View>

        {/* MODAIS */}
        <Modal visible={showSavedModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Escala salva</Text>
              <Text style={styles.modalText}>
                A escala foi salva como rascunho.
              </Text>
              <Pressable
                style={styles.modalBtn}
                onPress={() => setShowSavedModal(false)}
              >
                <Text style={styles.modalBtnText}>Entendi</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={showPublishModal} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Publicar escala</Text>
              <Text style={styles.modalText}>
                Após publicar, não será possível editar.
              </Text>

              <Pressable style={styles.modalPrimary} onPress={handlePublish}>
                <Text style={styles.modalPrimaryText}>
                  Confirmar publicação
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalSecondary}
                onPress={() => setShowPublishModal(false)}
              >
                <Text style={styles.modalSecondaryText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={errorModalVisible} transparent animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Atenção</Text>

              <Text style={styles.modalText}>
                {errorMessage}
              </Text>

              <Pressable
                style={styles.modalBtn}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Entendi</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </AppScreen>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16 },
  sectionTitle: { fontWeight: "800", marginTop: 16, marginBottom: 8 },
  sectionInfo: { fontWeight: "900", marginBottom: 8 },
  empty: { fontSize: 13, color: "#6B7280" },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontWeight: "700" },

  warning: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "700",
  },

  add: { color: "#2563EB", fontWeight: "800" },
  remove: { color: "#DC2626", fontWeight: "800" },

  saveBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  saveText: { color: "#FFF", fontWeight: "800" },

  publishBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    alignItems: "center",
  },
  publishText: { color: "#FFF", fontWeight: "800" },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  statusPublished: { backgroundColor: "#DCFCE7" },
  statusDraft: { backgroundColor: "#FEF3C7" },
  statusEmpty: { backgroundColor: "#E5E7EB" },
  statusText: { fontWeight: "800", fontSize: 12 },

  lockedInfo: {
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  lockedText: {
    color: "#065F46",
    fontWeight: "800",
    fontSize: 13,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: "900" },
  modalText: { fontSize: 14, marginBottom: 20 },
  modalBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  modalBtnText: { color: "#FFF", fontWeight: "800" },

  modalPrimary: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#16A34A",
    alignItems: "center",
    marginBottom: 8,
  },
  modalPrimaryText: { color: "#FFF", fontWeight: "800" },

  modalSecondary: { paddingVertical: 12, alignItems: "center" },
  modalSecondaryText: { color: "#6B7280", fontWeight: "700" },
});
