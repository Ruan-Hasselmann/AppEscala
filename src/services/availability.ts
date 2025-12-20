import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type AvailabilityDay = {
  morning?: boolean;
  night?: boolean;
};

/**
 * 🔹 Carrega disponibilidade do membro
 */
export async function loadAvailability(
  personId?: string
): Promise<Record<string, AvailabilityDay>> {
  if (!personId) return {};

  const ref = collection(db, "availability", personId, "days");
  const snap = await getDocs(ref);

  const result: Record<string, AvailabilityDay> = {};

  snap.forEach((doc) => {
    result[doc.id] = doc.data() as AvailabilityDay;
  });

  return result;
}

/**
 * 🔹 Salva disponibilidade por DIA
 */
export async function saveAvailability({
  personId,
  date,
  morning,
  night,
}: {
  personId: string;
  date: string;
  morning: boolean;
  night: boolean;
}) {
  const ref = doc(db, "availability", personId, "days", date);

  await setDoc(
    ref,
    {
      morning,
      night,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
