// src/services/availabilities.ts
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type Availability = {
  id: string;
  personId: string;
  serviceDayId: string;
  serviceLabel: string; // Manhã / Noite
  createdAt?: any;
};

/* =========================
   COLLECTION
========================= */

const COLLECTION = "availabilities";

/* =========================
   TOGGLE AVAILABILITY
   (se existir remove, se não existir cria)
========================= */

export async function toggleAvailability(params: {
  personId: string;
  serviceDayId: string;
  serviceLabel: string;
}) {
  const { personId, serviceDayId, serviceLabel } = params;

  if (!personId || !serviceDayId || !serviceLabel) {
    throw new Error("Parâmetros inválidos para disponibilidade");
  }

  const q = query(
    collection(db, COLLECTION),
    where("personId", "==", personId),
    where("serviceDayId", "==", serviceDayId),
    where("serviceLabel", "==", serviceLabel)
  );

  const snap = await getDocs(q);

  // 🔁 Se existir → remove (fica indisponível)
  if (!snap.empty) {
    await deleteDoc(doc(db, COLLECTION, snap.docs[0].id));
    return "removed";
  }

  // ➕ Se não existir → cria (fica disponível)
  const ref = doc(collection(db, COLLECTION));

  await setDoc(ref, {
    personId,
    serviceDayId,
    serviceLabel,
    createdAt: serverTimestamp(),
  });

  return "added";
}

/* =========================
   LIST BY PERSON
   (visão do membro)
========================= */

export async function listAvailabilityByPerson(params: {
  personId: string;
}): Promise<Availability[]> {
  const { personId } = params;
  if (!personId) return [];

  const q = query(
    collection(db, COLLECTION),
    where("personId", "==", personId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Availability, "id">),
  }));
}

/* =========================
   LIST BY SERVICE
   (visão do líder)
========================= */

export async function listAvailabilityByService(params: {
  serviceDayId: string;
  serviceLabel: string;
}): Promise<Availability[]> {
  const { serviceDayId, serviceLabel } = params;
  if (!serviceDayId || !serviceLabel) return [];

  const q = query(
    collection(db, COLLECTION),
    where("serviceDayId", "==", serviceDayId),
    where("serviceLabel", "==", serviceLabel)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Availability, "id">),
  }));
}
