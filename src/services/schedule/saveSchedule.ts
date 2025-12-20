import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";

type SaveScheduleParams = {
  month: string; // "2025-12"
  date: string;  // "2025-12-07"
  slot: "morning" | "night";
  items: {
    ministryId?: string;
    ministryName: string;
    role: string;
    personId?: string;
    personName: string;
  }[];
  createdByUid: string;
};

export async function saveSchedule({
  month,
  date,
  slot,
  items,
  createdByUid,
}: SaveScheduleParams) {
  const ref = doc(db, "schedules", month, date, slot);

  await setDoc(ref, {
    items,
    createdAt: serverTimestamp(),
    createdByUid,
  });
}
