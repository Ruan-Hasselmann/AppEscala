// src/services/settings.ts
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

export type AppSettings = {
  availability: {
    openDay: number;
    closeDay: number;
  };
};

/* =========================
   DOC REF
========================= */

const SETTINGS_DOC = doc(db, "settings", "app");

/* =========================
   QUERIES
========================= */

export async function getAppSettings(): Promise<AppSettings> {
  const snap = await getDoc(SETTINGS_DOC);

  // defaults seguros
  if (!snap.exists()) {
    return {
      availability: {
        openDay: 20,
        closeDay: 28,
      },
    };
  }

  return snap.data() as AppSettings;
}

/* =========================
   COMMANDS
========================= */

export async function saveAppSettings(settings: AppSettings) {
  await setDoc(
    SETTINGS_DOC,
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
