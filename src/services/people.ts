// src/services/people.ts
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

import { SystemRole } from "../constants/role";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type Person = {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: SystemRole;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type CreatePersonInput = {
  uid: string;
  name: string;
  email: string;
  role?: SystemRole;
};

export type UpdatePersonInput = Partial<
  Pick<Person, "name" | "email" | "role" | "active">
>;

const COLLECTION = "people";

/* =========================
   CREATE
========================= */

export async function createPerson(input: CreatePersonInput) {
  const ref = doc(db, COLLECTION, input.uid);

  const data = {
    uid: input.uid,
    name: input.name,
    email: input.email,
    role: input.role ?? "member",
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data, { merge: true });
}

/* =========================
   READ
========================= */

export async function getPersonById(uid: string): Promise<Person | null> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Person, "id">),
  };
}

export async function listPeople(): Promise<Person[]> {
  const ref = collection(db, COLLECTION);
  const snap = await getDocs(ref);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Person, "id">),
  }));
}

export async function listActivePeople(): Promise<Person[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("active", "==", true));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Person, "id">),
  }));
}

/* =========================
   UPDATE
========================= */

export async function updatePerson(uid: string, input: UpdatePersonInput) {
  const ref = doc(db, COLLECTION, uid);

  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
