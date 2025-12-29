import { generateScheduleForMonth } from "./scheduleGenerator";
import { persistGeneratedSchedules } from "./schedulePersistence";
import { deleteDraftSchedulesByMonth } from "./schedules";

export async function generateAndSaveSchedule(params: {
  ministryId: string;
  members: any[];
  serviceDays: any[];
  availability: any;
  generatedBy: string;
  replaceDrafts?: boolean;
}) {
  const serviceDayIds = params.serviceDays.map((d) => d.id);

  if (params.replaceDrafts) {
    await deleteDraftSchedulesByMonth({
      ministryId: params.ministryId,
      serviceDayIds,
    });
  }

  const result = await generateScheduleForMonth({
    ministryId: params.ministryId,
    members: params.members,
    serviceDays: params.serviceDays,
    availability: params.availability,
  });

  await persistGeneratedSchedules({
    schedules: result.schedules,
    generatedBy: params.generatedBy,
  });

  return result;
}
