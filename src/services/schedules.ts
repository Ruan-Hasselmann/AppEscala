// src/services/schedules.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/src/services/firebase";

/* =========================
   TYPES
========================= */

export type ScheduleStatus = "draft" | "published";

export type ScheduleAssignment = {
  personId: string;
  personName: string;
};

export type ScheduleTurnAssignments = {
  morning?: ScheduleAssignment[];
  night?: ScheduleAssignment[];
};

export type ScheduleDay = {
  date: string; // YYYY-MM-DD
  turns: ScheduleTurnAssignments;
};

export type Schedule = {
  id: string;
  ministryId: string;
  monthKey: string; // YYYY-MM

  status: ScheduleStatus;
  days: ScheduleDay[];

  createdAt?: any;
  updatedAt?: any;
};

export type CreateScheduleInput = {
  ministryId: string;
  monthKey: string;
};

/* =========================
   COLLECTION
========================= */

const COLLECTION = "schedules";

/* =========================
   CREATE
========================= */

export async function createSchedule(
  input: CreateScheduleInput
) {
  const ref = doc(collection(db, COLLECTION));

  const data = {
    ministryId: input.ministryId,
    monthKey: input.monthKey,

    status: "draft",
    days: [],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);
}

/* =========================
   READ
========================= */

export async function getScheduleById(
  id: string
): Promise<Schedule | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Schedule, "id">),
  };
}

export async function getScheduleByMinistryAndMonth(
  ministryId: string,
  monthKey: string
): Promise<Schedule | null> {
  const ref = collection(db, COLLECTION);
  const q = query(
    ref,
    where("ministryId", "==", ministryId),
    where("monthKey", "==", monthKey)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];

  return {
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  };
}

export async function listSchedulesByMinistry(
  ministryId: string
): Promise<Schedule[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("ministryId", "==", ministryId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Schedule, "id">),
  }));
}

/* =========================
   UPDATE
========================= */

export async function updateSchedule(
  id: string,
  data: Partial<
    Pick<Schedule, "status" | "days">
  >
) {
  const ref = doc(db, COLLECTION, id);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}