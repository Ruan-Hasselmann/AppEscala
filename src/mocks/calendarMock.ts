import { CalendarDayData } from "../components/CalendarDashboard";

export function getMockCalendarData(
  month: Date
): CalendarDayData[] {
  const data: CalendarDayData[] = [];

  const year = month.getFullYear();
  const m = month.getMonth();

  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, m, d);
    if (date.getMonth() !== m) break;

    // Exemplo: domingos
    if (date.getDay() === 0) {
      const week = Math.ceil(d / 7);

      data.push({
        date,
        services: [
          {
            label: "Culto",
            status: "published",
            people: [
              { name: "João", role: "Som" },
              { name: "Maria", role: "Projeção" },
            ],
          },
        ],
      });

    }
  }

  return data;
}
