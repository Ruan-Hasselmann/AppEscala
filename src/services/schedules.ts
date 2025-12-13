import { db } from "./firebase";

const MAX_PER_TURN = 1; // 🔥 fácil de mudar no futuro

type ScheduleDoc = {
  morning: string[];
  night: string[];
};

function normalizeSchedule(data?: Partial<ScheduleDoc>): ScheduleDoc {
  return {
    morning: data?.morning ?? [],
    night: data?.night ?? [],
  };
}

export async function getSchedule(
  ministryId: string,
  monthKey: string,
  dateKey: string
): Promise<ScheduleDoc> {
  const ref = db
    .collection("schedules")
    .doc(ministryId)
    .collection(monthKey)
    .doc(dateKey);

  const snap = await ref.get();

  return snap.exists
    ? normalizeSchedule(snap.data() as Partial<ScheduleDoc>)
    : { morning: [], night: [] };
}

export async function saveSchedule(
  ministryId: string,
  monthKey: string,
  dateKey: string,
  turn: "morning" | "night",
  userId: string
) {
  const ref = db
    .collection("schedules")
    .doc(ministryId)
    .collection(monthKey)
    .doc(dateKey);

  const snap = await ref.get();
  const current = snap.exists
    ? normalizeSchedule(snap.data() as Partial<ScheduleDoc>)
    : { morning: [], night: [] };

  let updatedTurn = [...current[turn]];

  if (updatedTurn.includes(userId)) {
    // remove apenas esse usuário
    updatedTurn = updatedTurn.filter((id) => id !== userId);
  } else {
    // respeita limite (hoje = 1)
    updatedTurn = [...updatedTurn, userId].slice(0, MAX_PER_TURN);
  }

  await ref.set(
    {
      ...current,
      [turn]: updatedTurn,
    },
    { merge: true }
  );
}