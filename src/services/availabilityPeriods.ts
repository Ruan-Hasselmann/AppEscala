import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type AvailabilityPeriod = {
  monthKey: string;
  opensAtDay: number;
  closesAtDay: number;
  status: "open" | "closed";
};

export async function getAvailabilityPeriod(monthKey: string) {
  const ref = doc(db, "availabilityPeriods", monthKey);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AvailabilityPeriod) : null;
}

export async function saveAvailabilityPeriod(data: AvailabilityPeriod) {
  const ref = doc(db, "availabilityPeriods", data.monthKey);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
