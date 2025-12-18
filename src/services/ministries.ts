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
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export type Ministry = {
  id: string;
  name: string;
  active: boolean;
};

const COL = "ministries";

export async function listAllMinistries(): Promise<Ministry[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ministry, "id">),
  }));
}

export async function findMinistryByName(name: string): Promise<Ministry | null> {
  const q = query(
    collection(db, COL),
    where("name", "==", name.trim())
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Ministry, "id">) };
}

export async function createMinistry(name: string) {
  await addDoc(collection(db, COL), {
    name: name.trim(),
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function activateMinistry(id: string) {
  await updateDoc(doc(db, COL, id), {
    active: true,
    updatedAt: serverTimestamp(),
  });
}

export async function deactivateMinistry(id: string) {
  await updateDoc(doc(db, COL, id), {
    active: false,
    updatedAt: serverTimestamp(),
  });
}

export async function listActiveMinistries(): Promise<Ministry[]> {
  const q = query(
    collection(db, COL),
    where("active", "==", true),
    orderBy("name", "asc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    ...(d.data() as Omit<Ministry, "id">),
    id: d.id,
  }));
}

export async function seedDefaultMinistries() {
  const defaults = [
    "SUPERVISÃO",
    "SOM",
    "PROJEÇÃO",
    "LUZ",
    "MESA",
    "CÂMERA",
    "FOTO",
    "TAKES",
    "STORIES",
  ];

  for (const name of defaults) {
    const existing = await findMinistryByName(name);

    if (!existing) {
      await createMinistry(name);
    } else if (!existing.active) {
      await activateMinistry(existing.id);
    }
  }
}

export async function getMinistryById(id: string): Promise<Ministry | null> {
  const ref = doc(db, "ministries", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Ministry, "id">),
  };
}
