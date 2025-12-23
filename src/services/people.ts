import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type PersonMinistry = {
  ministryId: string;
  role: "leader" | "member";
};

export type Person = {
  id: string;
  name: string;
  email: string;
  active: boolean;

  // NOVO
  ministries: PersonMinistry[];

  // LEGADO (mantemos por enquanto)
  ministryIds: string[];

  createdAt: Date;
  updatedAt: Date;
};


/* =========================
   MAPPERS
========================= */

function mapDoc(docSnap: any): Person {
  const data = docSnap.data();

  const ministries =
    data.ministries ??
    (data.ministryIds ?? []).map((id: string) => ({
      ministryId: id,
      role: "member",
    }));

  return {
    id: docSnap.id,
    name: data.name,
    email: data.email,
    active: data.active,
    ministries,
    ministryIds: ministries.map((m: { ministryId: any; }) => m.ministryId),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
}


/* =========================
   QUERIES
========================= */

/**
 * Lista todas as pessoas (admin)
 */
export async function listPeople(): Promise<Person[]> {
  const snap = await getDocs(collection(db, "people"));
  return snap.docs.map(mapDoc);
}

/**
 * Lista apenas pessoas ativas
 */
export async function listActivePeople(): Promise<Person[]> {
  const q = query(
    collection(db, "people"),
    where("active", "==", true)
  );

  const snap = await getDocs(q);
  return snap.docs.map(mapDoc);
}

/**
 * Lista pessoas ativas sem ministério
 */
export async function listPeopleWithoutMinistry(): Promise<Person[]> {
  const snap = await getDocs(collection(db, "people"));

  return snap.docs
    .map(mapDoc)
    .filter((p) => p.active && p.ministryIds.length === 0);
}

/**
 * Busca pessoa por id (admin)
 */
export async function getPersonById(
  personId: string
): Promise<Person | null> {
  const ref = doc(db, "people", personId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return mapDoc(snap);
}

/* =========================
   MUTATIONS
========================= */

/**
 * Atualiza ministérios da pessoa
 */
export async function updatePersonMinistries(
  personId: string,
  ministries: { ministryId: string; role: "leader" | "member" }[]
): Promise<void> {
  const ref = doc(db, "people", personId);

  await updateDoc(ref, {
    ministries,
    ministryIds: ministries.map((m) => m.ministryId), // legado
    updatedAt: serverTimestamp(),
  });
}


/**
 * Ativa / desativa pessoa
 */
export async function togglePersonStatus(
  personId: string,
  active: boolean
): Promise<void> {
  const ref = doc(db, "people", personId);

  await updateDoc(ref, {
    active,
    updatedAt: serverTimestamp(),
  });
}
