import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

type ConsolidatedSlot = {
  ministryId: string;
  dateKey: string;
  data: Record<string, any>;
};

/* =========================
   SERVICE
========================= */

/**
 * Consolida todas as escalas geradas pelos líderes
 * e publica a escala geral do mês.
 *
 * @param monthKey Ex: "2026-01"
 */
export async function consolidateMonthSchedule(monthKey: string) {
  // 1️⃣ Buscar todos os ministérios
  const ministriesSnap = await getDocs(collection(db, "ministries"));

  if (ministriesSnap.empty) {
    throw new Error("Nenhum ministério encontrado para consolidação.");
  }

  const consolidatedSlots: ConsolidatedSlot[] = [];

  // 2️⃣ Percorrer ministérios e coletar escalas do mês
  for (const ministryDoc of ministriesSnap.docs) {
    const ministryId = ministryDoc.id;

    const monthRef = collection(
      db,
      "schedules",
      ministryId,
      monthKey
    );

    const datesSnap = await getDocs(monthRef);

    for (const dateDoc of datesSnap.docs) {
      consolidatedSlots.push({
        ministryId,
        dateKey: dateDoc.id,
        data: dateDoc.data(),
      });
    }
  }

  // 3️⃣ Validação mínima
  if (consolidatedSlots.length === 0) {
    throw new Error(
      "Nenhuma escala encontrada. Certifique-se de que os ministérios finalizaram suas escalas."
    );
  }

  // 4️⃣ Publicar escala geral
  await setDoc(doc(db, "globalSchedules", monthKey), {
    monthKey,
    status: "published",
    slots: consolidatedSlots,
    publishedAt: serverTimestamp(),
  });
}
