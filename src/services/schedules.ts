// src/services/schedules.ts
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
  // 🔒 segurança extra
  if (
    !params.serviceDayId ||
    !params.serviceLabel ||
    !params.ministryId
  ) {
    throw new Error("Parâmetros inválidos para salvar escala");
  }

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", params.serviceDayId),
    where("serviceLabel", "==", params.serviceLabel),
    where("ministryId", "==", params.ministryId)
  );

  const snap = await getDocs(q);

  // Atualiza se existir
  if (!snap.empty) {
    const ref = doc(db, COLLECTION, snap.docs[0].id);

    await setDoc(
      ref,
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
  const ref = doc(collection(db, COLLECTION));

  await setDoc(ref, {
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