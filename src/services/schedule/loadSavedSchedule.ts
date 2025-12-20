import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export type SavedScheduleItem = {
  date: string;
  slot: "morning" | "night";

  ministryId: string;
  ministryName: string;

  role: string;

  personId: string;
  personName: string;
};



export async function loadSavedSchedule(
  month: string,
  date: string
): Promise<SavedScheduleItem[]> {
  const ref = collection(db, "schedules", month, date);
  const snap = await getDocs(ref);

  const items: SavedScheduleItem[] = [];

  snap.forEach((doc) => {
    const slot = doc.id as "morning" | "night";
    const data = doc.data();

    if (!Array.isArray(data.items)) return;

    data.items.forEach((i: any) => {
      items.push({
        date,
        slot,
        ministryId: i.ministryId,
        ministryName: i.ministryName,
        role: i.role,
        personId: i.personId,
        personName: i.personName,
      });
    });
  });

  return items;
}
