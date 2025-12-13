import { db } from "./firebase";

type Member = {
  id: string;
  name: string;
};

export async function getMembersByMinistry(ministryId: string): Promise<Member[]> {
  const snapshot = await db
    .collection("users")
    .where("role", "==", "MEMBER")
    .where("ministryId", "==", ministryId)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }));
}
