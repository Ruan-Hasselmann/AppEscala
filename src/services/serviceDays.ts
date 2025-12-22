// src/services/serviceDays.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/src/services/firebase";

/* =========================
   TYPES
========================= */

export type ServiceTurn = {
  morning: boolean;
  night: boolean;
};

export type ServiceDaysMap = Record<string, ServiceTurn>;

/* =========================
   HELPERS
========================= */

function monthKeyFromDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/* =========================
   COLLECTION
========================= */

const COLLECTION = "serviceDays";

/* =========================
   READ
========================= */

export async function getServiceDays(
  monthKey: string
): Promise<ServiceDaysMap> {
  const ref = doc(db, COLLECTION, monthKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) return {};

  return snap.data()?.days ?? {};
}

/* =========================
   WRITE
========================= */

export async function toggleServiceDay(
  monthKey: string,
  dateKey: string,
  turn: keyof ServiceTurn
) {
  const ref = doc(db, COLLECTION, monthKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const initial: ServiceDaysMap = {
      [dateKey]: {
        morning: turn === "morning",
        night: turn === "night",
      },
    };

    await setDoc(ref, {
      monthKey,
      days: initial,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return;
  }

  const data = snap.data();
  const days: ServiceDaysMap = data.days ?? {};

  const current = days[dateKey] ?? {
    morning: false,
    night: false,
  };

  days[dateKey] = {
    ...current,
    [turn]: !current[turn],
  };

  await updateDoc(ref, {
    days,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   UTILS
========================= */

export function buildMonthKey(date = new Date()) {
  return monthKeyFromDate(date);
}
