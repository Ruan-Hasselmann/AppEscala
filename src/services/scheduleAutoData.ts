import { listAvailabilitiesByServiceDay } from "./availabilities";
import { listPeople } from "./people";
import { getServiceDaysByMonth } from "./serviceDays";
import { getServicesByServiceDay } from "./services";

/* =========================
   TYPES
========================= */

type AutoServiceDay = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  label: string;
  turns: string[];
};

type AvailabilityMap = Record<
  string,
  Record<string, "available" | "unavailable">
>;

/* =========================
   HELPERS
========================= */

function resolveDate(d: any): Date | null {
  if (d?.date?.toDate) return d.date.toDate();
  if (d?.date instanceof Date) return d.date;
  if (typeof d?.date === "string") {
    const parsed = new Date(d.date);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatServiceDayLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function normalizeLabel(label: string) {
  return (label ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function makeAvailKey(dateKey: string, serviceLabel: string) {
  return `${dateKey}|${normalizeLabel(serviceLabel)}`;
}

/* =========================
   LOADER
========================= */

export async function loadAutoScheduleData(params: {
  ministryId: string;
  month: number;
  year: number;
}) {
  const { month, year } = params;

  /* =========================
     SERVICE DAYS + TURNS
  ========================= */

  const rawDays = await getServiceDaysByMonth(
    new Date(year, month, 1)
  );

  const serviceDays: AutoServiceDay[] = [];

  for (const d of rawDays) {
    const dateObj = resolveDate(d);
    if (!dateObj) continue;

    const services = (await getServicesByServiceDay(d.id)) ?? [];

    serviceDays.push({
      id: d.id,
      dateKey: dateObj.toISOString().slice(0, 10),
      label: formatServiceDayLabel(dateObj),
      turns: services.map((s) => s.label),
    });
  }

  /* =========================
     MEMBERS ELEGÍVEIS
     → quem marcou disponibilidade
  ========================= */

  const people = await listPeople();
  const eligiblePersonIds = new Set<string>();

  for (const day of serviceDays) {
    const avs = await listAvailabilitiesByServiceDay(day.id);
    avs.forEach((a) => eligiblePersonIds.add(a.personId));
  }

  const members = people
    .filter((p) => eligiblePersonIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  /* =========================
     AVAILABILITY MAP
  ========================= */

  const availability: AvailabilityMap = {};
  for (const m of members) availability[m.id] = {};

  for (const day of serviceDays) {
    const avs = await listAvailabilitiesByServiceDay(day.id);

    for (const av of avs) {
      const key = makeAvailKey(day.dateKey, av.serviceLabel);

      availability[av.personId][key] = "available";
    }
  }

  /* =========================
     SANITY CHECK
  ========================= */

  let totalKeys = 0;
  for (const personId of Object.keys(availability)) {
    totalKeys += Object.keys(availability[personId]).length;
  }

  return {
    members,
    serviceDays,
    availability,
  };
}
