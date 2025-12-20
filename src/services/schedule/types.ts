export type ScheduleAssignment = {
  date: string;
  ministryId: string;
  ministryName: string;
  role: string;
  personId: string;
  personName: string;
};

export type SchedulePerson = {
  personId: string;
  personName: string;
  leaderOfMinistryIds: string[]; // se >0, é supervisor
};
