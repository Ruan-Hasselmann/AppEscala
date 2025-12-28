import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { db } from "./firebase";
import { listMinistries } from "./ministries";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";
export type AttendanceStatus = "pending" | "confirmed" | "declined";

export type ScheduleAssignment = {
  personId: string;
  ministryId: string;
  attendance?: AttendanceStatus; // 🔥 confirmação do membro
};

export type Schedule = {
  id: string;
  ministryId: string;
  serviceDayId: string;

  serviceLabel: string;

  // 🔥 DATA REAL (para ordenação)
  serviceDayDate: any; // Firestore Timestamp

  // 🔹 TEXTO DE EXIBIÇÃO
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
   SAVE / UPDATE DRAFT
========================= */

export async function saveScheduleDraft(params: {
  ministryId: string;
  serviceDayId: string;
  serviceLabel: string;
  serviceDate: string;
  serviceDayDate: Date;
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

  if (!ministryId || !serviceDayId || !serviceLabel || !serviceDate || !createdBy) {
    throw new Error("Parâmetros inválidos para salvar escala");
  }

  // ❗ regra mínima: não permitir pessoa duplicada no MESMO turno
  const unique = new Set(assignments.map((a) => a.personId));
  if (unique.size !== assignments.length) {
    throw new Error("Pessoa duplicada na escala");
  }

  // 🔎 identifica por DIA + MINISTÉRIO + TURNO
  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", ministryId),
    where("serviceDayId", "==", serviceDayId),
    where("serviceLabel", "==", serviceLabel)
  );

  const snap = await getDocs(q);

  // 🔁 atualiza rascunho existente
  if (!snap.empty) {
    const ref = doc(db, COLLECTION, snap.docs[0].id);

    await setDoc(
      ref,
      {
        serviceDate,
        assignments,
        status: "draft",
        updatedAt: serverTimestamp(),
        serviceDayDate: params.serviceDayDate,
      },
      { merge: true }
    );

    return snap.docs[0].id;
  }

  // ➕ cria novo rascunho
  const ref = doc(collection(db, COLLECTION));

  await setDoc(ref, {
    ministryId,
    serviceDayId,
    serviceLabel,
    serviceDate,
    serviceDayDate: params.serviceDayDate,
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
   (por ministério + dias)
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
   (conflitos no mesmo dia)
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
   (dia + ministério + turno)
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
  const schedule = snap.docs[0].data() as Schedule;

  // ✅ ao publicar, todos começam como PENDING
  const assignmentsWithAttendance = (schedule.assignments ?? []).map((a) => ({
    ...a,
    attendance: "pending" as AttendanceStatus,
  }));

  await setDoc(
    ref,
    {
      status: "published",
      assignments: assignmentsWithAttendance, // ✅ FALTAVA ISSO
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   CONFIRM / DECLINE PRESENCE
========================= */

export async function updateAttendance(params: {
  scheduleId: string;
  personId: string;
  attendance: AttendanceStatus;
}) {
  const { scheduleId, personId, attendance } = params;

  const q = query(
    collection(db, COLLECTION),
    where("__name__", "==", scheduleId)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Escala não encontrada");
  }

  const ref = doc(db, COLLECTION, scheduleId);
  const schedule = snap.docs[0].data() as Schedule;

  if (schedule.status !== "published") {
    throw new Error("Escala não publicada");
  }

  const updatedAssignments = (schedule.assignments ?? []).map((a) =>
    a.personId === personId
      ? { ...a, attendance }
      : a
  );

  await setDoc(
    ref,
    {
      assignments: updatedAssignments,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function listPublishedSchedulesByPerson(params: {
  personId: string;
}): Promise<
  (Schedule & {
    attendance: "pending" | "confirmed" | "declined";
    ministryName: string;
  })[]
> {
  const { personId } = params;

  const [snap, ministries] = await Promise.all([
    getDocs(
      query(
        collection(db, COLLECTION),
        where("status", "==", "published")
      )
    ),
    listMinistries(),
  ]);

  const ministryIndex = new Map(
    ministries.map((m) => [m.id, m.name])
  );

  return snap.docs
    .map((d) => {
      const data = d.data() as Schedule;
      const assignment = data.assignments?.find(
        (a) => a.personId === personId
      );

      if (!assignment) return null;

      return {
        ...data,
        id: d.id,
        attendance: assignment.attendance ?? "pending",
        ministryName:
          ministryIndex.get(data.ministryId) ?? "Ministério",
      };
    })
    .filter(Boolean) as any[];
}

/* =========================
   REPLACE ASSIGNMENT
========================= */

export async function replaceScheduleAssignment(params: {
  scheduleId: string;
  oldPersonId: string;
  newPersonId: string;
  performedBy: string; // leader personId
}) {
  const { scheduleId, oldPersonId, newPersonId, performedBy } = params;

  if (!scheduleId || !oldPersonId || !newPersonId || !performedBy) {
    throw new Error("Parâmetros inválidos para substituição");
  }

  const ref = doc(db, "schedules", scheduleId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Escala não encontrada");
  }

  const data = snap.data();
  const assignments = data.assignments ?? [];

  // 🔒 Não permitir duplicar pessoa
  if (assignments.some((a: any) => a.personId === newPersonId)) {
    throw new Error("Pessoa já está escalada");
  }

  // 🔁 Remove antigo + adiciona novo
  const updatedAssignments = [
    ...assignments.filter(
      (a: any) => a.personId !== oldPersonId
    ),
    {
      personId: newPersonId,
      ministryId: data.ministryId,
      attendance: "pending",
    },
  ];

  await setDoc(
    ref,
    {
      assignments: updatedAssignments,
      updatedAt: serverTimestamp(),
      updatedBy: performedBy,
    },
    { merge: true }
  );
}