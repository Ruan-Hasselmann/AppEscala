import { listMemberships, Membership } from "./memberships";
import { listPeople, Person } from "./people";

export type LeaderPerson = {
  person: Person;
  membership: Membership;
};

export async function listLeaderPeople(
  ministryId: string
): Promise<LeaderPerson[]> {
  const [people, memberships] = await Promise.all([
    listPeople(),
    listMemberships(),
  ]);

  return memberships
    .filter(
      (m) =>
        m.ministryId === ministryId &&
        m.status === "active"
    )
    .map((m) => {
      const person = people.find((p) => p.id === m.personId);
      if (!person) return null;
      return { person, membership: m };
    })
    .filter(Boolean) as LeaderPerson[];
}
