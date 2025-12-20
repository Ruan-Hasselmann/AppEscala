import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { ScheduleSlot } from "./buildScheduleInput";

export async function loadScheduleSlots(
  month: string // ex: "2025-12"
): Promise<ScheduleSlot[]> {
  const ref = collection(
    db,
    "services_days",
    month,
    "dates"
  );

  const snap = await getDocs(ref);

  const slots: ScheduleSlot[] = [];

  snap.forEach((doc) => {
    const date = doc.id;
    const data = doc.data();

    if (data.morning) {
      slots.push({
        date,
        slot: "morning",
        key: `${date}_morning`,
      });
    }

    if (data.night) {
      slots.push({
        date,
        slot: "night",
        key: `${date}_night`,
      });
    }
  });

  return slots;
}
