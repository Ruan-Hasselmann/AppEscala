import {
  addDoc,
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   MODELOS
========================= */

export type Person = {
  id: string;
  name: string;
  email: string;
  role: "member" | "leader" | "admin";
  ministryIds: string[];
  active: boolean;
  invited: boolean;
  createdAt: number;
};

/* =========================
   DTOS (TIPOS DE USO)
========================= */

// Para criar pessoa
export type CreatePersonDTO = {
  name: string;
  email: string;
  role: "member" | "leader" | "admin";
  ministryIds: string[];
  active: boolean;
  invited: boolean;
};

// Para atualizar pessoa
export type UpdatePersonDTO = Partial<CreatePersonDTO>;

/* =========================
   SERVICE
========================= */

const COL = "people";

export async function listPeople(): Promise<Person[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Person, "id">),
  }));
}

export async function createPerson(data: CreatePersonDTO) {
  await addDoc(collection(db, COL), {
    ...data,
    createdAt: Date.now(),
  });
}

export async function updatePerson(id: string, data: UpdatePersonDTO) {
  await updateDoc(doc(db, COL, id), data);
}
