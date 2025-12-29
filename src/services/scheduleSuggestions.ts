import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

import { Schedule } from "./schedules";

/* =========================
   TYPES
========================= */

export type ScheduleSuggestion = {
  personId: string;
  score: number;
  reasons: string[];
};

/* =========================
   MAIN API
========================= */

export async function getScheduleSuggestions(params: {
  ministryId: string;
  serviceDayId: string;
  scheduleId: string;
  excludePersonIds?: string[];
}): Promise<ScheduleSuggestion[]> {
  const {
    ministryId,
    serviceDayId,
    scheduleId,
    excludePersonIds = [],
  } = params;

  console.log("[SUGGESTIONS] Params:", {
    ministryId,
    serviceDayId,
    scheduleId,
    excludePersonIds,
  });

  /* =========================
     0️⃣ Schedule atual
  ========================= */

  const scheduleSnap = await getDoc(
    doc(db, "schedules", scheduleId)
  );

  if (!scheduleSnap.exists()) {
    console.warn("[SUGGESTIONS] Schedule não encontrado");
    return [];
  }

  const currentSchedule = scheduleSnap.data() as Schedule;

  console.log(
    "[SUGGESTIONS] Schedule atual assignments:",
    currentSchedule.assignments?.map((a) => a.personId)
  );

  /* =========================
     1️⃣ Pessoas ocupadas no dia
  ========================= */

  const daySchedulesSnap = await getDocs(
    query(
      collection(db, "schedules"),
      where("serviceDayId", "==", serviceDayId)
    )
  );

  console.log(
    "[SUGGESTIONS] Total de escalas no dia:",
    daySchedulesSnap.docs.length
  );

  const busyPeople = new Set<string>();

  daySchedulesSnap.docs.forEach((docSnap) => {
    const s = docSnap.data() as Schedule;
    s.assignments?.forEach((a) =>
      busyPeople.add(a.personId)
    );
  });

  console.log(
    "[SUGGESTIONS] Pessoas ocupadas no dia:",
    Array.from(busyPeople)
  );

  /* =========================
     2️⃣ Exclusões explícitas
  ========================= */

  currentSchedule.assignments?.forEach((a) =>
    busyPeople.add(a.personId)
  );

  excludePersonIds.forEach((id) =>
    busyPeople.add(id)
  );

  console.log(
    "[SUGGESTIONS] Pessoas excluídas (após merge):",
    Array.from(busyPeople)
  );

  /* =========================
     3️⃣ Membros ativos do ministério
  ========================= */

  const membershipsSnap = await getDocs(
    query(
      collection(db, "memberships"),
      where("ministryId", "==", ministryId),
      where("active", "==", true)
    )
  );

  console.log(
    "[SUGGESTIONS] Membros ativos no ministério:",
    membershipsSnap.docs.length
  );

  const candidates: ScheduleSuggestion[] = [];

  for (const m of membershipsSnap.docs) {
    const personId = m.data().personId;

    if (busyPeople.has(personId)) {
      console.log(
        "[SUGGESTIONS] Ignorado (ocupado/excluído):",
        personId
      );
      continue;
    }

    let score = 0;
    const reasons: string[] = [];

    score += 10;
    reasons.push("Livre no dia");

    console.log(
      "[SUGGESTIONS] Candidato válido:",
      personId
    );

    candidates.push({
      personId,
      score,
      reasons,
    });
  }

  /* =========================
     4️⃣ Resultado final
  ========================= */

  candidates.sort((a, b) => b.score - a.score);

  console.log(
    "[SUGGESTIONS] Total de candidatos finais:",
    candidates.length
  );

  console.log(
    "[SUGGESTIONS] Lista final:",
    candidates
  );

  return candidates;
}

/* =========================
   HELPER — BEST ONLY
========================= */

export async function getBestScheduleSuggestion(params: {
  ministryId: string;
  serviceDayId: string;
  scheduleId: string;
  excludePersonIds?: string[];
}): Promise<ScheduleSuggestion | null> {
  const list = await getScheduleSuggestions(params);

  console.log(
    "[SUGGESTIONS] Melhor sugestão:",
    list[0] ?? null
  );

  return list.length > 0 ? list[0] : null;
}
