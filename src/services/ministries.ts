// src/services/ministries.ts
import {
  collection,
  doc,
  documentId,
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

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ministry, "id">),
  }));
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

export async function listMinistriesByIds(
  ministryIds: string[]
): Promise<Ministry[]> {
  if (ministryIds.length === 0) return [];

  // 🔥 Firestore limita "in" a 10 itens
  const chunks: string[][] = [];
  for (let i = 0; i < ministryIds.length; i += 10) {
    chunks.push(ministryIds.slice(i, i + 10));
  }

  const results: Ministry[] = [];

  for (const ids of chunks) {
    const q = query(
      collection(db, "ministries"),
      where(documentId(), "in", ids)
    );

    const snap = await getDocs(q);

    snap.forEach((doc) => {
      results.push({
        id: doc.id,
        ...(doc.data() as Omit<Ministry, "id">),
      });
    });
  }

  return results;
}