/* =====================================
   SCHEDULE GENERATOR — FASE 1.4
   Geração automática de escalas (DRAFT)
===================================== */

type Person = {
  id: string;
  name: string;
};

type ServiceDay = {
  id: string;
  dateKey: string; // YYYY-MM-DD
  label: string;   // "sábado, 10 de janeiro"
  turns: string[]; // ["Manhã", "Noite"]
};

type AvailabilityMap = Record<
  string,
  Record<string, "available" | "unavailable">
>;

type LoadInfo = {
  total: number;
  lastServiceDay?: string;
};

type LoadMap = Record<string, LoadInfo>;

type ScheduleFlag =
  | "forced_assignment"
  | "double_shift"
  | "overload";

type GeneratedSchedule = {
  ministryId: string;
  serviceDayId: string;
  serviceDate: string;
  serviceLabel: string;
  assignments: {
    personId: string;
    ministryId: string;
  }[];
  status: "draft";
  flags?: ScheduleFlag[];
};

type GeneratedScheduleResult = {
  schedules: GeneratedSchedule[];
  flags: ScheduleFlag[];
};

/* =====================================
   WEIGHTS
===================================== */

const WEIGHTS = {
  sameDay: 10,
  consecutive: 3,
  extraMonthly: 2,
  unavailableFallback: 50,
};

/* =====================================
   HELPERS
===================================== */

function getServiceKey(dateKey: string, turn: string) {
  return `${dateKey}|${turn}`;
}

function calculateScore(params: {
  personId: string;
  loadMap: LoadMap;
  usedToday: Set<string>;
  currentDay: string;
}) {
  const load = params.loadMap[params.personId];
  let score = load?.total ?? 0;

  // penaliza repetir no mesmo dia (fallback apenas)
  if (params.usedToday.has(params.personId)) {
    score += WEIGHTS.sameDay;
  }

  if (load?.lastServiceDay === params.currentDay) {
    score += WEIGHTS.consecutive;
  }

  return score;
}

/* =====================================
   FUNÇÃO PRINCIPAL
===================================== */

export async function generateScheduleForMonth(params: {
  ministryId: string;
  members: Person[];
  serviceDays: ServiceDay[];
  availability: AvailabilityMap;
}): Promise<GeneratedScheduleResult> {
  const { ministryId, members, serviceDays, availability } = params;

  const loadMap: LoadMap = {};
  const schedules: GeneratedSchedule[] = [];
  const globalFlags = new Set<ScheduleFlag>();

  // Inicializa carga
  members.forEach((m) => {
    loadMap[m.id] = { total: 0 };
  });

  // Itera pelos dias
  for (const day of serviceDays) {
    const usedToday = new Set<string>();

    for (const turn of day.turns) {
      const normalizedTurn = turn
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const serviceKey = `${day.dateKey}|${normalizedTurn}`;

      // 1️⃣ disponíveis para o turno
      const available = members.filter(
        (p) => availability[p.id]?.[serviceKey] === "available"
      );

      let candidates: Person[] = [];
      let fallbackUsed = false;

      // 2️⃣ REGRA PRINCIPAL:
      // evita repetir pessoa no mesmo dia se houver alternativa
      const preferred = available.filter(
        (p) => !usedToday.has(p.id)
      );

      if (preferred.length > 0) {
        candidates = preferred;
      } else if (available.length > 0) {
        // fallback: só sobrou quem já serviu hoje
        candidates = available;
        fallbackUsed = true;
        globalFlags.add("double_shift");
      } else {
        // fallback total: ninguém disponível para o turno
        candidates = [...members];
        fallbackUsed = true;

        // só marca forced se realmente não houver nenhum disponível
        if (available.length === 0) {
          globalFlags.add("forced_assignment");
        }
      }

      // 3️⃣ rankear candidatos
      const ranked = candidates
        .map((p) => ({
          personId: p.id,
          score:
            calculateScore({
              personId: p.id,
              loadMap,
              usedToday,
              currentDay: day.dateKey,
            }) +
            (fallbackUsed ? WEIGHTS.unavailableFallback : 0),
        }))
        .sort((a, b) => a.score - b.score);

      const bestScore = ranked[0].score;
      const tied = ranked.filter(r => r.score === bestScore);

      const chosen = tied[Math.floor(Math.random() * tied.length)];

      if (!chosen) continue;

      const localFlags: ScheduleFlag[] = [];
      if (usedToday.has(chosen.personId)) {
        localFlags.push("double_shift");
      }

      // 4️⃣ cria schedule
      schedules.push({
        ministryId,
        serviceDayId: day.id,
        serviceDate: day.label,
        serviceLabel: turn,
        assignments: [
          {
            personId: chosen.personId,
            ministryId,
          },
        ],
        status: "draft",
        flags: localFlags.length ? localFlags : undefined,
      });

      // 5️⃣ atualiza estado
      loadMap[chosen.personId].total += 1;
      loadMap[chosen.personId].lastServiceDay = day.dateKey;
      usedToday.add(chosen.personId);
    }
  }

  return {
    schedules,
    flags: Array.from(globalFlags),
  };
}
