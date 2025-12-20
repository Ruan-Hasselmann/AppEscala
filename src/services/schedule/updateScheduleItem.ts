import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

type Params = {
  month: string;
  date: string;
  slot: "morning" | "night";
  ministryId: string;
  role: string;
  personId: string;
  personName: string;
};

export async function updateScheduleItem({
  month,
  date,
  slot,
  ministryId,
  role,
  personId,
  personName,
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
        personId,
        personName,
        updatedAt: new Date(),
      };
    }

    return item;
  });

  await updateDoc(ref, {
    items: updatedItems,
  });
}
