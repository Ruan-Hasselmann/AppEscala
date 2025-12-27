import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";

export type ScheduleAssignment = {
  personId: string;
  ministryId: string;
};

export type Schedule = {
  id: string;
  ministryId: string;
  serviceDayId: string;
  serviceLabel: string;
  serviceDate: string;
  status: ScheduleStatus;
  assignments: ScheduleAssignment[];
  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
};

/* =========================
   COLLECTION
========================= */

const COLLECTION = "schedules";

/* =========================
   INTERNAL – CONFLICT CHECK
========================= */

async function assertNoConflictSameDay(params: {
  serviceDayId: string;
  ministryId: string;
  serviceLabel: string;
  assignments: ScheduleAssignment[];
}) {
  const { serviceDayId, ministryId, serviceLabel, assignments } = params;

  if (!serviceDayId || assignments.length === 0) return;

  const personIds = assignments.map((a) => a.personId);

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", serviceDayId)
  );

  const snap = await getDocs(q);

  snap.docs.forEach((docSnap) => {
    const s = docSnap.data() as Schedule;

    // 🔥 IGNORA turnos DIFERENTES (permitido)
    if (s.serviceLabel !== serviceLabel) {
      return;
    }

    // 🔥 IGNORA a própria escala (mesmo ministério + mesmo turno)
    if (
      s.ministryId === ministryId &&
      s.serviceLabel === serviceLabel
    ) {
      return;
    }

    // 🚫 BLOQUEIA: mesma pessoa no MESMO TURNO
    (s.assignments ?? []).forEach((a) => {
      if (personIds.includes(a.personId)) {
        throw new Error("CONFLICT_SAME_TURN");
      }
    });
  });
}

/* =========================
   SAVE / UPDATE DRAFT
========================= */

export async function saveScheduleDraft(params: {
  ministryId: string;
  serviceDayId: string;
  serviceLabel: string;
  serviceDate: string;
  assignments: ScheduleAssignment[];
  createdBy: string;
}) {
  const {
    ministryId,
    serviceDayId,
    serviceLabel,
    serviceDate,
    assignments,
    createdBy,
  } = params;

  if (
    !ministryId ||
    !serviceDayId ||
    !serviceLabel ||
    !serviceDate ||
    !createdBy
  ) {
    throw new Error("Parâmetros inválidos para salvar escala");
  }

  // ❗ Regra mínima: não permitir duplicados no mesmo turno
  const unique = new Set(assignments.map((a) => a.personId));
  if (unique.size !== assignments.length) {
    throw new Error("Pessoa duplicada na escala");
  }

  // 🔒 REGRA FORTE: conflito no mesmo dia (backend)
  await assertNoConflictSameDay({
    serviceDayId,
    ministryId,
    serviceLabel,
    assignments,
  });

  // Identifica por DIA + MINISTÉRIO + TURNO
  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", ministryId),
    where("serviceDayId", "==", serviceDayId),
    where("serviceLabel", "==", serviceLabel)
  );

  const snap = await getDocs(q);

  // Atualiza se existir
  if (!snap.empty) {
    const ref = doc(db, COLLECTION, snap.docs[0].id);

    await setDoc(
      ref,
      {
        serviceDate,
        assignments,
        status: "draft",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return snap.docs[0].id;
  }

  // Cria novo draft
  const ref = doc(collection(db, COLLECTION));

  await setDoc(ref, {
    ministryId,
    serviceDayId,
    serviceLabel,
    serviceDate,
    status: "draft",
    assignments,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

/* =========================
   LIST BY MONTH
========================= */

export async function listSchedulesByMonth(params: {
  ministryId: string;
  serviceDayIds: string[];
}): Promise<Schedule[]> {
  if (params.serviceDayIds.length === 0) return [];

  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "in", params.serviceDayIds)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

/* =========================
   LIST BY SERVICE DAY
========================= */

export async function listSchedulesByServiceDay(params: {
  serviceDayId: string;
}): Promise<Schedule[]> {
  const { serviceDayId } = params;

  if (!serviceDayId) return [];

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", serviceDayId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

/* =========================
   GET BY SERVICE
========================= */

export async function getScheduleByService(params: {
  ministryId: string;
  serviceDayId: string;
  serviceLabel: string;
}): Promise<Schedule | null> {
  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "==", params.serviceDayId),
    where("serviceLabel", "==", params.serviceLabel)
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const d = snap.docs[0];

  return {
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  };
}

/* =========================
   PUBLISH
========================= */

export async function publishSchedule(params: {
  ministryId: string;
  serviceDayId: string;
  serviceLabel: string;
}) {
  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "==", params.serviceDayId),
    where("serviceLabel", "==", params.serviceLabel)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Nenhuma escala para publicar");
  }

  const ref = doc(db, COLLECTION, snap.docs[0].id);

  await setDoc(
    ref,
    {
      status: "published",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
