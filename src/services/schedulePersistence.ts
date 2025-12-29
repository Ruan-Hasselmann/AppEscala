import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Salva schedules gerados como DRAFT
 * - Não publica
 * - Atualiza se já existir (mesmo dia + turno + ministério)
 */
export async function persistGeneratedSchedules(params: {
  schedules: {
    ministryId: string;
    serviceDayId: string;
    serviceDate: string;
    serviceLabel: string;
    assignments: {
      personId: string;
      ministryId: string;
    }[];
    flags?: string[];
  }[];
  generatedBy: string;
}) {
  const { schedules, generatedBy } = params;

  for (const schedule of schedules) {
    const q = query(
      collection(db, "schedules"),
      where("ministryId", "==", schedule.ministryId),
      where("serviceDayId", "==", schedule.serviceDayId),
      where("serviceLabel", "==", schedule.serviceLabel)
    );

    const snap = await getDocs(q);

    // 🔁 Atualiza rascunho existente
    if (!snap.empty) {
      const ref = doc(db, "schedules", snap.docs[0].id);

      await setDoc(
        ref,
        {
          assignments: schedule.assignments,
          flags: schedule.flags ?? [],
          status: "draft",
          updatedAt: serverTimestamp(),
          updatedBy: generatedBy,
        },
        { merge: true }
      );

      continue;
    }

    // ➕ Cria novo rascunho
    const ref = doc(collection(db, "schedules"));

    await setDoc(ref, {
      ministryId: schedule.ministryId,
      serviceDayId: schedule.serviceDayId,
      serviceDate: schedule.serviceDate,
      serviceLabel: schedule.serviceLabel,
      assignments: schedule.assignments,
      flags: schedule.flags ?? [],
      status: "draft",
      createdAt: serverTimestamp(),
      createdBy: generatedBy,
      updatedAt: serverTimestamp(),
    });
  }
}
