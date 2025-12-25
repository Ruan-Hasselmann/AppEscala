// src/services/schedules.ts
import {
  collection,
  deleteDoc,
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

export type SchedulePerson = {
  personId: string;
  name: string;
};

export type Schedule = {
  id: string;
  serviceDayId: string;
  serviceLabel: string;
  ministryId: string;
  status: ScheduleStatus;
  people: SchedulePerson[];
  createdAt?: any;
  updatedAt?: any;
};

/* =========================
   COLLECTION
========================= */

const COLLECTION = "schedules";

/* =========================
   SAVE DRAFT
========================= */

export async function saveScheduleDraft(params: {
  serviceDayId: string;
  serviceLabel: string;
  ministryId: string;
  people: SchedulePerson[];
}) {
  if (
    !params.serviceDayId ||
    !params.serviceLabel ||
    !params.ministryId
  ) {
    throw new Error("Parâmetros inválidos");
  }

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", params.serviceDayId),
    where("serviceLabel", "==", params.serviceLabel),
    where("ministryId", "==", params.ministryId)
  );

  const snap = await getDocs(q);

  // 🔥 SE NÃO TEM PESSOAS → REMOVE A ESCALA
  if (params.people.length === 0) {
    if (!snap.empty) {
      await deleteDoc(doc(db, COLLECTION, snap.docs[0].id));
    }
    return;
  }

  // Atualiza se existir
  if (!snap.empty) {
    await setDoc(
      doc(db, COLLECTION, snap.docs[0].id),
      {
        people: params.people,
        status: "draft",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  // Cria novo
  await setDoc(doc(collection(db, COLLECTION)), {
    serviceDayId: params.serviceDayId,
    serviceLabel: params.serviceLabel,
    ministryId: params.ministryId,
    people: params.people,
    status: "draft",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listSchedulesByMonth(params: {
  ministryId: string;
  serviceDayIds: string[];
}): Promise<Schedule[]> {
  if (params.serviceDayIds.length === 0) return [];

  const q = query(
    collection(db, "schedules"),
    where("ministryId", "==", params.ministryId),
    where("serviceDayId", "in", params.serviceDayIds)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

export async function getScheduleByService(params: {
  serviceDayId: string;
  serviceLabel: string;
  ministryId: string;
}) {
  const q = query(
    collection(db, "schedules"),
    where("serviceDayId", "==", params.serviceDayId),
    where("serviceLabel", "==", params.serviceLabel),
    where("ministryId", "==", params.ministryId)
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const d = snap.docs[0];

  return {
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  };
}

export async function publishSchedule(params: {
  serviceDayId: string;
  serviceLabel: string;
  ministryId: string;
}) {
  const q = query(
    collection(db, "schedules"),
    where("serviceDayId", "==", params.serviceDayId),
    where("serviceLabel", "==", params.serviceLabel),
    where("ministryId", "==", params.ministryId)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Nenhuma escala para publicar");
  }

  const ref = doc(db, "schedules", snap.docs[0].id);

  await setDoc(
    ref,
    {
      status: "published",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}