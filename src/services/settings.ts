import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* =========================
   TYPES
========================= */

export type SystemSettings = {
  /* Identidade */
  churchName: string;

  /* Tempo */
  timezone: string; // ex: "America/Sao_Paulo"
  activeMonthKey: string; // ex: "2026-01"

  /* Disponibilidade */
  availabilityOpen: boolean;
  availabilityDeadlineDay: number; // dia do mês (ex: 20)

  /* Escalas */
  schedulesOpen: boolean;
  allowConsecutiveWeeks: boolean;
  maxSchedulesPerMonth: number;
  defaultTurns: string[];

  /* Estado do sistema */
  consolidated: boolean;

  /* Meta */
  updatedAt?: any;
};

const REF = doc(db, "settings", "system");

/* =========================
   READ
========================= */

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const snap = await getDoc(REF);
  return snap.exists() ? (snap.data() as SystemSettings) : null;
}

/* =========================
   WRITE (ADMIN)
========================= */

export async function saveSystemSettings(
  data: Partial<SystemSettings>
) {
  await setDoc(
    REF,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/* =========================
   HELPERS (OPTIONAL)
========================= */

/**
 * Trava o sistema após consolidação
 */
export async function markMonthAsConsolidated(
  monthKey: string
) {
  await setDoc(
    REF,
    {
      activeMonthKey: monthKey,
      availabilityOpen: false,
      schedulesOpen: false,
      consolidated: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Reabre um mês (uso administrativo)
 */
export async function reopenMonth(monthKey: string) {
  await setDoc(
    REF,
    {
      activeMonthKey: monthKey,
      availabilityOpen: true,
      schedulesOpen: true,
      consolidated: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
