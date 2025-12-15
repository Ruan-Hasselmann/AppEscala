import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type Ministry = {
  id: string;
  name: string;
  active: boolean;
};

const COL = "ministries";

/**
 * Lista ministérios ativos
 */
export async function listActiveMinistries(): Promise<Ministry[]> {
  const q = query(
    collection(db, COL),
    orderBy("name", "asc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();

    return {
      ...data,       // 👈 espalha primeiro
      id: d.id,      // 👈 id vem por último (correto)
    } as Ministry;
  });
}

/**
 * Cria ministérios padrão (executar uma vez ou sob demanda)
 */
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

  const colRef = collection(db, COL);

  for (const name of defaults) {
    const id = name.toLowerCase();

    await setDoc(
      doc(colRef, id),
      {
        name,
        active: true,
      },
      { merge: true }
    );
  }
}
