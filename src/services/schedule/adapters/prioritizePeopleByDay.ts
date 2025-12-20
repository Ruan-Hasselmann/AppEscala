import { SchedulePerson } from "../types";

type Params = {
  people: SchedulePerson[];
  date: string;
  usedByDay: Record<string, Set<string>>;
};

export function prioritizePeopleByDay({
  people,
  date,
  usedByDay,
}: Params): SchedulePerson[] {
  return [...people].sort((a, b) => {
    const usedA = usedByDay[date]?.has(a.personId) ?? false;
    const usedB = usedByDay[date]?.has(b.personId) ?? false;

    // 1️⃣ Quem NÃO serviu no dia vem primeiro
    if (usedA !== usedB) {
      return usedA ? 1 : -1;
    }

    // 2️⃣ Líderes vêm por último
    const isLeaderA = a.leaderOfMinistryIds.length > 0;
    const isLeaderB = b.leaderOfMinistryIds.length > 0;

    if (isLeaderA !== isLeaderB) {
      return isLeaderA ? 1 : -1;
    }

    return 0;
  });
}
