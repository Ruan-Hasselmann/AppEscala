import {
  collection,
  deleteDoc,
  doc,
  getDoc,
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
export type AttendanceStatus = "pending" | "confirmed" | "declined";

export type ScheduleAssignment = {
  personId: string;
  ministryId: string;
  attendance?: AttendanceStatus;
  reason?: string; // ✅ motivo de recusa
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

  // ✅ índice auxiliar para queries por pessoa
  assignmentPersonIds: string[];

  createdBy: string;
  createdAt?: any;
  updatedAt?: any;
  updatedBy?: string;
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

  if (
    !ministryId ||
    !serviceDayId ||
    !serviceLabel ||
    !serviceDate ||
    !createdBy
  ) {
    throw new Error("Parâmetros inválidos para salvar escala");
  }

  // ❗ não permitir pessoa duplicada no mesmo turno
  const unique = new Set(assignments.map((a) => a.personId));
  if (unique.size !== assignments.length) {
    throw new Error("Pessoa duplicada na escala");
  }

  const assignmentPersonIds = assignments.map((a) => a.personId);

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
        serviceDayDate: params.serviceDayDate,
        assignments,
        assignmentPersonIds,
        status: "draft",
        updatedAt: serverTimestamp(),
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
    assignmentPersonIds,
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
  if (!params.serviceDayId) return [];

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", params.serviceDayId)
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
   PUBLISH (INDIVIDUAL)
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

  const assignmentsWithAttendance = (schedule.assignments ?? []).map(
    (a) => ({
      ...a,
      attendance: "pending" as AttendanceStatus,
    })
  );

  await setDoc(
    ref,
    {
      status: "published",
      assignments: assignmentsWithAttendance,
      assignmentPersonIds: assignmentsWithAttendance.map(
        (a) => a.personId
      ),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   PUBLISH BY MONTH
========================= */

export async function publishSchedulesByMonth(params: {
  ministryId: string;
  serviceDayIds: string[];
}) {
  if (params.serviceDayIds.length === 0) return;

  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "in", params.serviceDayIds),
    where("status", "==", "draft")
  );

  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map(async (docSnap) => {
      const data = docSnap.data() as Schedule;

      const assignmentsWithAttendance = (data.assignments ?? []).map(
        (a) => ({
          ...a,
          attendance: "pending" as AttendanceStatus,
        })
      );

      await setDoc(
        docSnap.ref,
        {
          status: "published",
          assignments: assignmentsWithAttendance,
          assignmentPersonIds: assignmentsWithAttendance.map(
            (a) => a.personId
          ),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    })
  );
}

/* =========================
   REVERT MONTH TO DRAFT
========================= */

export async function revertSchedulesToDraftByMonth(params: {
  ministryId: string;
  serviceDayIds: string[];
}) {
  if (params.serviceDayIds.length === 0) return;

  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "in", params.serviceDayIds),
    where("status", "==", "published")
  );

  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((docSnap) =>
      setDoc(
        docSnap.ref,
        {
          status: "draft",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    )
  );
}

/* =========================
   ATTENDANCE
========================= */

export async function updateAttendance(params: {
  scheduleId: string;
  personId: string;
  attendance: AttendanceStatus;
  reason?: string;
}) {
  const { scheduleId, personId, attendance, reason } = params;

  const ref = doc(db, COLLECTION, scheduleId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Escala não encontrada");
  }

  const schedule = snap.data() as Schedule;

  if (schedule.status !== "published") {
    throw new Error("Escala não publicada");
  }

  const updatedAssignments = (schedule.assignments ?? []).map((a) =>
    a.personId === personId
      ? { ...a, attendance, ...(reason ? { reason } : {}) }
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

/* =========================
   REPLACE ASSIGNMENT
========================= */

export async function replaceScheduleAssignment(params: {
  scheduleId: string;
  oldPersonId: string;
  newPersonId: string;
  performedBy: string;
}) {
  const { scheduleId, oldPersonId, newPersonId, performedBy } =
    params;

  const ref = doc(db, COLLECTION, scheduleId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Escala não encontrada");
  }

  const data = snap.data() as Schedule;

  const updatedAssignments = [
    ...data.assignments.filter((a) => a.personId !== oldPersonId),
    {
      personId: newPersonId,
      ministryId: data.ministryId,
      attendance: "pending" as AttendanceStatus,
    },
  ];

  await setDoc(
    ref,
    {
      assignments: updatedAssignments,
      assignmentPersonIds: updatedAssignments.map(
        (a) => a.personId
      ),
      updatedAt: serverTimestamp(),
      updatedBy: performedBy,
    },
    { merge: true }
  );
}

/* =========================
   DELETE
========================= */

export async function deleteSchedulesByServiceDay(serviceDayId: string) {
  if (!serviceDayId) return;

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", serviceDayId)
  );

  const snap = await getDocs(q);

  await Promise.all(
    snap.docs.map((d) =>
      deleteDoc(doc(db, COLLECTION, d.id))
    )
  );
}

/* =========================
   DRAFT HELPERS
========================= */

export async function listDraftSchedulesByMonth(params: {
  ministryId: string;
  serviceDayIds: string[];
}) {
  if (params.serviceDayIds.length === 0) return [];

  const q = query(
    collection(db, COLLECTION),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "in", params.serviceDayIds),
    where("status", "==", "draft")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));
}

export async function deleteDraftSchedulesByMonth(params: {
  ministryId: string;
  serviceDayIds: string[];
}) {
  const drafts = await listDraftSchedulesByMonth(params);

  await Promise.all(
    drafts.map((d) =>
      deleteDoc(doc(db, COLLECTION, d.id))
    )
  );
}

/* =========================
   LIST PUBLISHED BY PERSON ✅ FIX
========================= */

export async function listPublishedSchedulesByPerson(params: {
  personId: string;
}) {
  const { personId } = params;

  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "published")
  );

  const snap = await getDocs(q);

  return snap.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Schedule, "id">),
    }))
    .filter((s) =>
      s.assignments?.some((a) => a.personId === personId)
    );
}