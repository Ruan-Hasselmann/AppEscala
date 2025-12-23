import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type ServiceDay = {
  id: string;
  date: Date;
};

/* =========================
   HELPERS
========================= */

// normaliza a data para 00:00
function normalizeDate(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* =========================
   SERVICE
========================= */

const serviceDaysRef = collection(db, "serviceDays");

export async function createServiceDay(date: Date) {
  const normalized = normalizeDate(date);

  await addDoc(serviceDaysRef, {
    date: Timestamp.fromDate(normalized),
    enabled: true,
    createdAt: Timestamp.now(),
  });
}

export async function getServiceDaysByMonth(
  month: Date
): Promise<ServiceDay[]> {
  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1
  );
  start.setHours(0, 0, 0, 0);

  const end = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  );
  end.setHours(23, 59, 59, 999);

  const q = query(
    serviceDaysRef,
    where("date", ">=", Timestamp.fromDate(start)),
    where("date", "<=", Timestamp.fromDate(end))
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    date: doc.data().date.toDate(),
  }));
}

export async function deleteServiceDay(id: string) {
  await deleteDoc(doc(db, "serviceDays", id));
}