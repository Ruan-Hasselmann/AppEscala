import { Person } from "@/src/services/people";
import { Schedule } from "@/src/services/schedules";

type Params = {
  scheduleToEdit: Schedule;
  people: Person[];
  allSchedules: Schedule[];
};

export function suggestBestReplacement({
  scheduleToEdit,
  people,
  allSchedules,
}: Params): Person | null {
  const { serviceDayId, ministryId } = scheduleToEdit;

  // 1️⃣ Pessoas já escaladas nesse DIA
  const peopleBusyThatDay = new Set(
    allSchedules
      .filter((s) => s.serviceDayId === serviceDayId)
      .flatMap((s) => s.assignments.map((a) => a.personId))
  );

  // 2️⃣ Contagem de escalas no mês
  const countByPerson: Record<string, number> = {};

  allSchedules.forEach((s) => {
    s.assignments.forEach((a) => {
      countByPerson[a.personId] =
        (countByPerson[a.personId] ?? 0) + 1;
    });
  });

  // 3️⃣ Filtrar candidatos válidos
  const candidates = people.filter(
    (p) =>
      p.id !== scheduleToEdit.assignments[0]?.personId &&
      !peopleBusyThatDay.has(p.id)
  );

  if (candidates.length === 0) return null;

  // 4️⃣ Ordenar por menor carga
  candidates.sort((a, b) => {
    const countA = countByPerson[a.id] ?? 0;
    const countB = countByPerson[b.id] ?? 0;
    return countA - countB;
  });

  return candidates[0];
}
