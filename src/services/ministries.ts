// src/services/ministries.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/src/services/firebase";


/* =========================
   TYPES
========================= */

export type Ministry = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type CreateMinistryInput = {
  name: string;
  description?: string;
};

export type UpdateMinistryInput = Partial<
  Pick<Ministry, "name" | "description" | "active">
>;

/* =========================
   COLLECTION
========================= */

const COLLECTION = "ministries";

/* =========================
   CREATE
========================= */

export async function createMinistry(
  input: CreateMinistryInput
) {
  const ref = doc(collection(db, COLLECTION));

  const data = {
    name: input.name,
    description: input.description ?? "",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);
}

/* =========================
   READ
========================= */

export async function getMinistryById(
  id: string
): Promise<Ministry | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Ministry, "id">),
  };
}

export async function listMinistries(): Promise<Ministry[]> {
  const ref = collection(db, COLLECTION);
  const snap = await getDocs(ref);

  const ministries = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ministry, "id">),
  }));

  ministries.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
  );

  return ministries;
}

export async function listActiveMinistries(): Promise<Ministry[]> {
  const ref = collection(db, COLLECTION);
  const snap = await getDocs(ref);

  return snap.docs
    .map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Ministry, "id">),
    }))
    .filter((m) => m.active);
}

/* =========================
   UPDATE
========================= */

export async function updateMinistry(
  id: string,
  input: UpdateMinistryInput
) {
  const ref = doc(db, COLLECTION, id);

  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
