import { generateSchedule } from "./generateSchedule";
import { ScheduleAssignment, SchedulePerson } from "./types";

type MinistryInput = {
  id: string;
  name: string;
  roles: string[];
  people: SchedulePerson[];
};

type GenerateGlobalScheduleInput = {
  dates: string[];
  ministries: MinistryInput[];
};

export function generateScheduleForMinistries({
  dates,
  ministries,
}: GenerateGlobalScheduleInput): ScheduleAssignment[] {
  const globalAssignments: ScheduleAssignment[] = [];

  // 🔒 Controle global por data
  const usageByDate: Record<
    string,
    Record<string, { ministryIds: string[] }>
  > = {};

  function canAssignGlobal(
    date: string,
    person: SchedulePerson,
    ministry: MinistryInput
  ): boolean {
    const usage = usageByDate[date]?.[person.personId];
    if (!usage) return true;

    const isSupervisao =
      ministry.name.toUpperCase() === "SUPERVISÃO";

    // ✅ exceção: supervisão + ministério liderado
    if (isSupervisao && person.leaderOfMinistryIds.length > 0) {
      const onlyLeaderMinistriesSoFar = usage.ministryIds.every(
        (mId) => person.leaderOfMinistryIds.includes(mId)
      );
      if (onlyLeaderMinistriesSoFar) return true;
    }

    return false;
  }

  function registerGlobalUsage(
    date: string,
    personId: string,
    ministryId: string
  ) {
    usageByDate[date] ??= {};
    usageByDate[date][personId] ??= { ministryIds: [] };
    usageByDate[date][personId].ministryIds.push(ministryId);
  }

  for (const ministry of ministries) {
    const local = generateSchedule({
      dates,
      ministry,
    });

    for (const item of local) {
      const person = ministry.people.find(
        (p) => p.personId === item.personId
      );
      if (!person) continue;

      if (!canAssignGlobal(item.date, person, ministry)) {
        continue; // descarta conflito global
      }

      registerGlobalUsage(
        item.date,
        item.personId,
        ministry.id
      );

      globalAssignments.push(item);
    }
  }

  return globalAssignments;
}
