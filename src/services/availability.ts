import { db } from "./firebase";

// 🔹 Tipo centralizado
export type AvailabilityTurn = {
  morning: boolean;
  night: boolean;
};

export async function setAvailabilityForDay(
  userId: string,
  monthKey: string,
  dateKey: string,
  turns: { morning: boolean; night: boolean }
) {
  const ref = db
    .collection("availability")
    .doc(userId)
    .collection(monthKey)
    .doc(dateKey);

  if (!turns.morning && !turns.night) {
    // nenhum turno → remove doc
    await ref.delete();
  } else {
    await ref.set(turns);
  }
}


export async function getUserAvailability(
  userId: string,
  monthKey: string
): Promise<Record<string, AvailabilityTurn>> {
  const snapshot = await db
    .collection("availability")
    .doc(userId)
    .collection(monthKey)
    .get();

  const days: Record<string, AvailabilityTurn> = {};

  snapshot.forEach((doc) => {
    days[doc.id] = doc.data() as AvailabilityTurn;
  });

  return days;
}
