import { db } from "./firebase";

// 🔹 Tipo centralizado
export type AvailabilityTurn = {
  morning: boolean;
  night: boolean;
};

export async function toggleAvailability(
  userId: string,
  monthKey: string,
  dateKey: string,
  turn: "morning" | "night"
) {
  const ref = db
    .collection("availability")
    .doc(userId)
    .collection(monthKey)
    .doc(dateKey);

  const snap = await ref.get();

  const data: AvailabilityTurn = snap.exists
    ? (snap.data() as AvailabilityTurn)
    : { morning: false, night: false };

  const updated: AvailabilityTurn = {
    ...data,
    [turn]: !data[turn],
  };

  // 🧹 Se nenhum turno estiver marcado, remove o documento
  if (!updated.morning && !updated.night) {
    await ref.delete();
  } else {
    // ✅ merge garante que não sobrescreva nada indevido no futuro
    await ref.set(updated, { merge: true });
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
