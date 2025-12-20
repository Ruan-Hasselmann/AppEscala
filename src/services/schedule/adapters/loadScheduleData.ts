import { listMemberships } from "../../memberships";
import { listActiveMinistries } from "../../ministries";
import { listPeople } from "../../people";

export async function loadScheduleDataFromFirestore() {
  const [ministries, people, memberships] = await Promise.all([
    listActiveMinistries(),
    listPeople(),
    listMemberships(),
  ]);

  return {
    ministries,
    people,
    memberships,
  };
}
