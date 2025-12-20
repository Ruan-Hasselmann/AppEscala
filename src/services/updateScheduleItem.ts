import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

type Params = {
  month: string;
  date: string;
  slot: "morning" | "night";
  ministryId: string;
  role: string;
  newPerson: {
    id: string;
    name: string;
  };
};

export async function updateScheduleItem({
  month,
  date,
  slot,
  ministryId,
  role,
  newPerson,
}: Params) {
  const ref = doc(db, "schedules", month, date, slot);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const data = snap.data();

  const updatedItems = data.items.map((item: any) => {
    if (
      item.ministryId === ministryId &&
      item.role === role
    ) {
      return {
        ...item,
        personId: newPerson.id,
        personName: newPerson.name,
        updatedAt: new Date(),
      };
    }

    return item;
  });

  await updateDoc(ref, {
    items: updatedItems,
  });
}
