import { createServiceDay, getServiceDaysByMonth } from "./serviceDays";
import { createService, getServicesByServiceDay } from "./services";

/* =========================
   HELPERS
========================= */

function getWeekdayOccurrence(date: Date) {
  const weekday = date.getDay();
  let count = 0;

  for (let d = 1; d <= date.getDate(); d++) {
    const check = new Date(
      date.getFullYear(),
      date.getMonth(),
      d
    );

    if (check.getDay() === weekday) {
      count++;
    }
  }

  return { weekday, occurrence: count };
}

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
) {
  let count = 0;

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;

    if (date.getDay() === weekday) {
      count++;
      if (count === occurrence) return date;
    }
  }

  return null;
}

/* =========================
   SERVICE
========================= */

export async function duplicateServiceDays(
  sourceMonth: Date,
  targetMonth: Date
) {
  const sourceDays = await getServiceDaysByMonth(sourceMonth);
  if (sourceDays.length === 0) {
    throw new Error("Mês de origem não possui cultos.");
  }

  const targetDays = await getServiceDaysByMonth(targetMonth);
  if (targetDays.length > 0) {
    throw new Error(
      "O mês de destino já possui cultos configurados."
    );
  }

  for (const sourceDay of sourceDays) {
    const { weekday, occurrence } =
      getWeekdayOccurrence(sourceDay.date);

    const newDate = getNthWeekdayOfMonth(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      weekday,
      occurrence
    );

    if (!newDate) continue;

    // cria o dia
    await createServiceDay(newDate);

    // busca novamente para pegar o ID
    const refreshedDays = await getServiceDaysByMonth(targetMonth);
    const newServiceDay = refreshedDays.find(
      (d) =>
        d.date.getFullYear() === newDate.getFullYear() &&
        d.date.getMonth() === newDate.getMonth() &&
        d.date.getDate() === newDate.getDate()
    );

    if (!newServiceDay) continue;

    // duplica os cultos
    const services =
      await getServicesByServiceDay(sourceDay.id);

    for (const s of services) {
      await createService({
        serviceDayId: newServiceDay.id,
        label: s.label,
        order: s.order,
        type: s.type,
        shift: s.shift,
      });
    }
  }
}
