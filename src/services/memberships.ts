// src/services/memberships.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/src/services/firebase";

/* =========================
   TYPES
========================= */

export type MembershipRole = "leader" | "member";
export type MembershipStatus = "invited" | "active" | "inactive";

export type Membership = {
  id: string;
  personId: string;
  ministryId: string;

  role: MembershipRole;
  status: MembershipStatus;

  // dados desnormalizados (UX / performance)
  personName: string;
  personEmail: string;
  ministryName: string;

  inviteToken?: string;

  createdAt?: any;
  updatedAt?: any;
};

export type CreateMembershipInput = {
  personId: string;
  ministryId: string;
  role?: MembershipRole;
  status?: MembershipStatus;

  personName: string;
  personEmail: string;
  ministryName: string;

  inviteToken?: string;
};

export type UpdateMembershipInput = Partial<
  Pick<
    Membership,
    | "role"
    | "status"
    | "personName"
    | "personEmail"
    | "ministryName"
    | "inviteToken"
  >
>;

/* =========================
   COLLECTION
========================= */

const COLLECTION = "memberships";

/* =========================
   CREATE
========================= */

export async function createMembership(
  input: CreateMembershipInput
) {
  const ref = doc(collection(db, COLLECTION));

  const data = {
    personId: input.personId,
    ministryId: input.ministryId,

    role: input.role ?? "member",
    status: input.status ?? "invited",

    personName: input.personName,
    personEmail: input.personEmail,
    ministryName: input.ministryName,

    inviteToken: input.inviteToken ?? "",

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, data);
}

/* =========================
   READ
========================= */

export async function getMembershipById(
  id: string
): Promise<Membership | null> {
  const ref = doc(db, COLLECTION, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...(snap.data() as Omit<Membership, "id">),
  };
}

export async function listMemberships(): Promise<Membership[]> {
  const ref = collection(db, COLLECTION);
  const snap = await getDocs(ref);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

export async function listMembershipsByPerson(
  personId: string
): Promise<Membership[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("personId", "==", personId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

export async function listMembershipsByMinistry(
  ministryId: string
): Promise<Membership[]> {
  const ref = collection(db, COLLECTION);
  const q = query(ref, where("ministryId", "==", ministryId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

/* =========================
   UPDATE
========================= */

export async function updateMembership(
  id: string,
  input: UpdateMembershipInput
) {
  const ref = doc(db, COLLECTION, id);

  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}
