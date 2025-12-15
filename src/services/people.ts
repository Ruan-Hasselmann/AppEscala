import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type Person = {
  id: string;
  name: string;
  email: string;
  createdAt?: any;
  updatedAt?: any;
};

const COL = "people";

export type CreatePersonDTO = {
  name: string;
  email: string;
};

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updatePerson(id: string, data: Partial<CreatePersonDTO>) {
  await updateDoc(doc(db, COL, id), {
    ...(data.name !== undefined ? { name: data.name.trim() } : {}),
    ...(data.email !== undefined ? { email: data.email.trim().toLowerCase() } : {}),
    updatedAt: serverTimestamp(),
  });
}
