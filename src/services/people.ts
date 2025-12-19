import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type SystemRole = "admin" | "leader" | "member";

export type Person = {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  createdAt?: any;
  updatedAt?: any;
};

const COL = "people";

/* =========================
   CRUD
========================= */

export async function listPeople(): Promise<Person[]> {
  const q = query(collection(db, COL), orderBy("name"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Person, "id">),
  }));
}

export async function createPerson(data: {
  name: string;
  email: string;
  role: SystemRole;
}): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updatePerson(
  id: string,
  data: Partial<Omit<Person, "id">>
) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/* =========================
   HELPERS
========================= */

/**
 * 🔑 Resolve a Person pelo email do Auth
 * (Leader / Member)
 */
export async function getPersonByEmail(
  email: string
): Promise<Person | null> {
  const q = query(
    collection(db, COL),
    where("email", "==", email.toLowerCase())
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  return {
    id: snap.docs[0].id,
    ...(snap.docs[0].data() as Omit<Person, "id">),
  };
}
