import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export type Member = {
  id: string;
  name: string;
  role: "member" | "leader";
  ministryId: string;
  active?: boolean;
};

/**
 * 🔹 Retorna membros ATIVOS de um ministério
 * Usado no dashboard do líder para montar escala
 */
export async function getMembersByMinistry(
  ministryId: string
): Promise<Member[]> {
  if (!ministryId) return [];

  const q = query(
    collection(db, "people"),
    where("ministryId", "==", ministryId),
    where("active", "==", true)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Member, "id">),
  }));
}
