import { Membership } from "../../memberships";
import { Ministry } from "../../ministries";
import { Person } from "../../people";
import { getRolesForMinistry } from "../roles/ministryRoles";
import { SchedulePerson } from "../types";
import { prioritizePeopleByDay } from "./prioritizePeopleByDay";

/**
 * Slot = um culto específico (dia + turno)
 */
export type ScheduleSlot = {
  date: string; // YYYY-MM-DD
  slot: "morning" | "night";
  key: string; // ex: 2025-12-07_morning
};

type BuildScheduleInputParams = {
  ministries: Ministry[];
  people: Person[];
  memberships: Membership[];
  slots: ScheduleSlot[];
};

export function buildScheduleInput({
  ministries,
  people,
  memberships,
  slots,
}: BuildScheduleInputParams) {
  // 1️⃣ Apenas memberships ativas
  const activeMemberships = memberships.filter(
    (m) => m.status === "active"
  );

  // 2️⃣ Controle de uso por DIA (prioridade)
  const usedByDay: Record<string, Set<string>> = {};

  // 3️⃣ Mapear liderança por pessoa
  const leaderMap: Record<string, string[]> = {};
  for (const m of activeMemberships) {
    if (m.role === "leader") {
      leaderMap[m.personId] ??= [];
      leaderMap[m.personId].push(m.ministryId);
    }
  }

  // 4️⃣ Criar SchedulePerson
  const schedulePeople: SchedulePerson[] = people.map((p) => ({
    personId: p.id,
    personName: p.name,
    leaderOfMinistryIds: leaderMap[p.id] ?? [],
  }));

  /**
   * 5️⃣ Para CADA SLOT, montar ministérios prontos para a engine
   */
  const slotsInput = slots.map((slot) => {
    const ministriesInput = ministries.map((ministry) => {
      // Pessoas desse ministério
      const peopleInMinistry = activeMemberships
        .filter((m) => m.ministryId === ministry.id)
        .map((m) =>
          schedulePeople.find((p) => p.personId === m.personId)
        )
        .filter(Boolean) as SchedulePerson[];

      // 🔑 PRIORIDADE: quem ainda não serviu no dia vem primeiro
      const prioritizedPeople = prioritizePeopleByDay({
        people: peopleInMinistry,
        date: slot.date,
        usedByDay,
      });

      return {
        id: ministry.id,
        name: ministry.name,
        roles: getRolesForMinistry(ministry.name),
        people: prioritizedPeople,
      };
    });

    return {
      slot,
      ministriesInput,
    };
  });

  return {
    schedulePeople,
    slotsInput,
    usedByDay, // usado depois para registrar quem foi escalado
  };
}
