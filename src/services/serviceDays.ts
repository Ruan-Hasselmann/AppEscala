import { db } from "./firebase";

export type ServiceTurn = {
  morning: boolean;
  night: boolean;
};

export async function toggleServiceDay(
  monthKey: string,
  dateKey: string,
  turn: "morning" | "night"
) {
  const ref = db
    .collection("services_days")
    .doc(monthKey)
    .collection("dates")
    .doc(dateKey);

  const snap = await ref.get();

  const data: ServiceTurn = snap.exists
    ? (snap.data() as ServiceTurn)
    : { morning: false, night: false };

  const updated = {
    ...data,
    [turn]: !data[turn],
  };

  // Se nenhum turno estiver ativo, remove o dia
  if (!updated.morning && !updated.night) {
    await ref.delete();
  } else {
    await ref.set(updated);
  }
}

export async function getServiceDays(monthKey: string) {
  const snapshot = await db
    .collection("services_days")
    .doc(monthKey)
    .collection("dates")
    .get();

  const days: Record<string, ServiceTurn> = {};

  snapshot.forEach((doc) => {
    days[doc.id] = doc.data() as ServiceTurn;
  });

  return days;
}
