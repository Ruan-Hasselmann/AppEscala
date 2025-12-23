import { db } from "@/src/services/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

/* =========================
   TYPES
========================= */

export type Ministry = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  leaderIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateMinistryInput = {
  name: string;
  description?: string;
  leaderIds?: string[];
};

/* =========================
   HELPERS
========================= */

// gera slug seguro e consistente
function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mapDoc(docSnap: any): Ministry {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    isActive: data.isActive,
    leaderIds: data.leaderIds ?? [],
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
}

/* =========================
   QUERIES
========================= */

export async function getMinistries(): Promise<Ministry[]> {
  const snap = await getDocs(collection(db, "ministries"));
  return snap.docs.map(mapDoc);
}

export async function getActiveMinistries(): Promise<Ministry[]> {
  const q = query(
    collection(db, "ministries"),
    where("isActive", "==", true)
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function getMinistriesByLeader(
  personId: string
): Promise<Ministry[]> {
  const q = query(
    collection(db, "ministries"),
    where("leaderIds", "array-contains", personId),
    where("isActive", "==", true)
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

export async function getMinistryById(
  ministryId: string
): Promise<Ministry | null> {
  const ref = doc(db, "ministries", ministryId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return mapDoc(snap);
}

/* =========================
   MUTATIONS
========================= */

export async function createMinistry(
  input: CreateMinistryInput
): Promise<void> {
  const slug = generateSlug(input.name);

  // garante slug único
  const slugQuery = query(
    collection(db, "ministries"),
    where("slug", "==", slug)
  );
  const existing = await getDocs(slugQuery);

  if (!existing.empty) {
    throw new Error("Já existe um ministério com esse nome.");
  }

  await addDoc(collection(db, "ministries"), {
    name: input.name,
    slug,
    description: input.description ?? "",
    isActive: true,
    leaderIds: input.leaderIds ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateMinistry(
  ministryId: string,
  data: {
    name?: string;
    description?: string;
    leaderIds?: string[];
  }
): Promise<void> {
  const ref = doc(db, "ministries", ministryId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleMinistryStatus(
  ministryId: string,
  isActive: boolean
): Promise<void> {
  const ref = doc(db, "ministries", ministryId);

  await updateDoc(ref, {
    isActive,
    updatedAt: serverTimestamp(),
  });
}
