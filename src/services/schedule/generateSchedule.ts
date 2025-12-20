import { ScheduleAssignment, SchedulePerson } from "./types";

type GenerateScheduleInput = {
  dates: string[];
  ministry: {
    id: string;
    name: string; // "SUPERVISÃO" ou "SOM", etc
    roles: string[];
    people: SchedulePerson[];
  };
};

/**
 * Regras atuais (V1):
 * - Uma pessoa só pode aparecer 1x por dia, EXCETO:
 *   - se o ministério atual for SUPERVISÃO, e
 *   - a pessoa for líder (leaderOfMinistryIds.length > 0), e
 *   - no dia ela só tenha sido usada em ministérios que ela lidera
 */
export function generateSchedule({
  dates,
  ministry,
}: GenerateScheduleInput): ScheduleAssignment[] {
  const assignments: ScheduleAssignment[] = [];

  // usageByDate[date][personId] = { ministryIds: [] }
  const usageByDate: Record<string, Record<string, { ministryIds: string[] }>> =
    {};

  const isSupervisao = ministry.name.toUpperCase() === "SUPERVISÃO";

  function canAssign(date: string, person: SchedulePerson): boolean {
    const usage = usageByDate[date]?.[person.personId];
    if (!usage) return true;

    // Exceção: SUPERVISÃO + ministério liderado (no mesmo dia)
    if (isSupervisao && person.leaderOfMinistryIds.length > 0) {
      const onlyLeaderMinistriesSoFar = usage.ministryIds.every((mId) =>
        person.leaderOfMinistryIds.includes(mId)
      );
      if (onlyLeaderMinistriesSoFar) return true;
    }

    return false;
  }

  function registerUsage(date: string, personId: string, ministryId: string) {
    usageByDate[date] ??= {};
    usageByDate[date][personId] ??= { ministryIds: [] };
    usageByDate[date][personId].ministryIds.push(ministryId);
  }

  // round-robin simples
  let idx = 0;
  const people = ministry.people;

  for (const date of dates) {
    for (const role of ministry.roles) {
      let attempts = 0;

      while (attempts < people.length) {
        const person = people[idx % people.length];
        idx++;
        attempts++;

        if (!canAssign(date, person)) continue;

        assignments.push({
          date,
          ministryId: ministry.id,
          ministryName: ministry.name,
          role,
          personId: person.personId,
          personName: person.personName,
        });

        registerUsage(date, person.personId, ministry.id);
        break;
      }
    }
  }

  return assignments;
}
