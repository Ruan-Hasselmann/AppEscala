import { collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getMonthKey } from "../utils/calendar";
import { db } from "./firebase";
import { listLeaderPeople } from "./leader";
import { getServiceDays } from "./serviceDays";

type Slot = {
    date: string;
    turn: "morning" | "night";
    personId: string;
};

export async function generateLeaderSchedule(
    ministryId: string,
    leaderUid: string,
    year: number,
    month: number
) {
    const monthKey = getMonthKey(new Date(year, month));

    // 1️⃣ Dias de culto
    const serviceDays = await getServiceDays(monthKey);

    // 2️⃣ Pessoas do ministério
    const people = await listLeaderPeople(ministryId);
    const activePeople = people
        .filter((p) => p.membership.status === "active")
        .map((p) => p.person.id);

    if (activePeople.length === 0) {
        throw new Error("Nenhuma pessoa ativa no ministério");
    }

    // 3️⃣ Geração simples (round-robin)
    const slots: Slot[] = [];
    let index = 0;

    Object.entries(serviceDays).forEach(([date, turns]) => {
        if (turns.morning) {
            slots.push({
                date,
                turn: "morning",
                personId: activePeople[index % activePeople.length],
            });
            index++;
        }

        if (turns.night) {
            slots.push({
                date,
                turn: "night",
                personId: activePeople[index % activePeople.length],
            });
            index++;
        }
    });

    // 4️⃣ Salva como rascunho
    const ref = doc(
        collection(db, "ministrySchedules"),
        `${ministryId}_${monthKey}`
    );

    await setDoc(ref, {
        ministryId,
        monthKey,
        status: "draft",
        generatedBy: leaderUid,
        slots,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return { monthKey, slots };
}

export type ScheduleSlot = {
    date: string;
    turn: "morning" | "night";
    personId: string;
};

export async function getLeaderSchedule(
    ministryId: string,
    monthKey: string
) {
    const ref = doc(db, "ministrySchedules", `${ministryId}_${monthKey}`);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return snap.data() as {
        status: "draft" | "final";
        slots: ScheduleSlot[];
    };
}

export async function updateLeaderSchedule(
    ministryId: string,
    monthKey: string,
    slots: ScheduleSlot[]
) {
    const ref = doc(db, "ministrySchedules", `${ministryId}_${monthKey}`);

    await updateDoc(ref, {
        slots,
        updatedAt: serverTimestamp(),
    });
}

export async function finalizeLeaderSchedule(
    ministryId: string,
    monthKey: string
) {
    const ref = doc(db, "ministrySchedules", `${ministryId}_${monthKey}`);

    await updateDoc(ref, {
        status: "final",
        updatedAt: serverTimestamp(),
    });
}
