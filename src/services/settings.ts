import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type SystemSettings = {
  churchName: string;
  timezone: string;
  availabilityDeadlineDay: number;
  allowConsecutiveWeeks: boolean;
  maxSchedulesPerMonth: number;
  defaultTurns: string[];
};

const REF = doc(db, "settings", "system");

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const snap = await getDoc(REF);
  return snap.exists() ? (snap.data() as SystemSettings) : null;
}

export async function saveSystemSettings(data: SystemSettings) {
  await setDoc(
    REF,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
