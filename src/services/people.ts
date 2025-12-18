import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type SystemRole = "admin" | "leader" | "member";

export type Person = {
  id: string;
  name: string;
  email: string;
  role: SystemRole; // 👈 AGORA EXISTE
  uid?: string;
  createdAt: number;
};

const COL = "people";

export type CreatePersonDTO = {
  name: string;
  email: string;
  role: SystemRole;
};

export type UpdatePersonDTO = Partial<{
  name: string;
  email: string;
  role: SystemRole;
  uid: string;
}>;

export async function listPeople(): Promise<Person[]> {
  const q = query(collection(db, COL), orderBy("name"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Person, "id">),
  }));
}

export async function createPerson(data: CreatePersonDTO): Promise<string> {
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
  data: UpdatePersonDTO
) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getPersonById(id: string): Promise<Person | null> {
  const ref = doc(db, "people", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Person, "id">),
  };
}
