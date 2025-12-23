import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type Service = {
  id: string;
  serviceDayId: string;
  label: string; // "Manhã", "Noite", "18h"
  order: number; // 1, 2, 3...
  createdAt?: Date;
  type: "single" | "multiple";
  shift?: "manha" | "tarde" | "noite" | "custom";
};

const servicesRef = collection(db, "services");

/* =========================
   QUERIES
========================= */

export async function getServicesByServiceDay(
  serviceDayId: string
): Promise<Service[]> {
  const q = query(
    servicesRef,
    where("serviceDayId", "==", serviceDayId),
    orderBy("order", "asc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      serviceDayId: data.serviceDayId,
      label: data.label,
      order: data.order ?? 1,
      createdAt: data.createdAt?.toDate?.(),
      type: data.type ?? "single",
      shift: data.shift,
    };
  });
}

/* =========================
   COMMANDS
========================= */

export async function createService(params: {
  serviceDayId: string;
  label: string;
  order: number;
  type: "single" | "multiple";
  shift?: "manha" | "tarde" | "noite" | "custom"
}) {
  await addDoc(servicesRef, {
    serviceDayId: params.serviceDayId,
    label: params.label,
    order: params.order,
    createdAt: Timestamp.now(),
  });
}

export async function updateService(
  id: string,
  updates: Partial<Pick<Service, "label" | "order">>
) {
  await updateDoc(doc(db, "services", id), updates);
}

export async function deleteService(id: string) {
  await deleteDoc(doc(db, "services", id));
}
