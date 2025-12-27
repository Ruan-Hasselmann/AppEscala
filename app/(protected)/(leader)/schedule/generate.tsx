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
  warningsText?: string[];
};

/* =========================
   HELPERS
========================= */

function parseServiceDayDate(dateStr?: string): Date {
  if (!dateStr) return new Date();

  // tenta ISO (YYYY-MM-DD, etc)
  const parsed = Date.parse(dateStr);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed);
  }

  // fallback seguro (meio-dia evita bug de timezone)
  const today = new Date();
  return new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12
  );
}

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
  const [scheduleStatus, setScheduleStatus] =
    useState<"draft" | "published" | "empty">("empty");

  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const [conflictsByPerson, setConflictsByPerson] = useState<
    Map<string, ConflictInfo[]>
  >(new Map());

  const [availablePersonIds, setAvailablePersonIds] = useState<Set<string>>(
    new Set()
  );

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const safeServiceDayId = serviceDayId ?? "";
  const safeMinistryId = ministryId ?? "";
  const safeServiceLabel = (serviceLabel ?? "").trim();

  const isPublished = scheduleStatus === "published";

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

    setPeople(p.filter((x) => x.active));
    setMinistries(m.filter((x) => x.active));

    setAvailablePersonIds(new Set(availability.map((a) => a.personId)));

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
      assigned.filter((x) => x.ministryId === safeMinistryId),
    [assigned, safeMinistryId]
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

    if (otherMinistryPublished) blocked = true;

    if (relevant.some((i) => i.status === "draft")) {
      warningsText.push("⚠️ Em rascunho em outro ministério hoje");
    }

    if (relevant.some((i) => i.serviceLabel !== safeServiceLabel)) {
      warningsText.push("ℹ️ Já escalado em outro turno hoje");
    }

    return { blocked, warningsText };
  }

  const availablePeople = useMemo(() => {
    if (!safeMinistryId) return [];

    return people
      .filter((p) =>
        p.ministries.some((m) => m.ministryId === safeMinistryId)
      )
      .filter((p) => availablePersonIds.has(p.id))
      .filter((p) => !assignedForThisTurn.some((a) => a.personId === p.id))
      .map((p) => {
        const { blocked, warningsText } = buildWarnings(p.id);
        return { ...p, blocked, warningsText };
      })
      .filter((p) => !p.blocked)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [
    people,
    safeMinistryId,
    availablePersonIds,
    assignedForThisTurn,
    conflictsByPerson,
  ]);

  /* =========================
     ACTIONS
  ========================= */

  function assignPerson(person: Person) {
    if (isPublished) return;

    setAssigned((prev) => [
      ...prev,
      { personId: person.id, ministryId: safeMinistryId },
    ]);
  }

  function removePerson(personId: string) {
    if (isPublished) return;

    setAssigned((prev) =>
      prev.filter((x) => x.personId !== personId)
    );
  }

  function handleUserError() {
    setErrorMessage("Não foi possível salvar a escala.");
    setErrorModalVisible(true);
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
        serviceDayDate: parseServiceDayDate(date), // ✅ FIX DEFINITIVO
        assignments: assignedForThisTurn,
        createdBy: user.personId,
      });

      setScheduleStatus("draft");
      setShowSavedModal(true);
      await loadSchedule();
    } catch {
      handleUserError();
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
    router.push("/(protected)/(leader)/schedule");
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

          <Text style={styles.sectionTitle}>Pessoas escaladas</Text>

          {assignedForThisTurn.map((a) => {
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
          })}

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

          {availablePeople.map((p) => (
            <Pressable
              key={p.id}
              style={styles.card}
              onPress={() => assignPerson(p)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{p.name}</Text>
                {p.warningsText?.map((w, i) => (
                  <Text key={i} style={styles.warning}>{w}</Text>
                ))}
              </View>
              <Text style={styles.add}>Adicionar</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* MODAIS */}
      <Modal visible={showSavedModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Escala salva</Text>
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
            <Text style={styles.modalText}>{errorMessage}</Text>
            <Pressable
              style={styles.modalBtn}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Entendi</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: { fontWeight: "700" },
  warning: { fontSize: 12, color: "#6B7280", fontWeight: "700" },
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
  modalTitle: { fontSize: 18, fontWeight: "900", marginBottom: 12 },
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
