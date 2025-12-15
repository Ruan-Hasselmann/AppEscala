import {
    addDoc,
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "./firebase";

export type MembershipRole = "member" | "leader";
export type MembershipStatus = "invited" | "active" | "inactive";

export type Membership = {
  id: string;
  personId: string;
  ministryId: string;
  role: MembershipRole;
  status: MembershipStatus;

  inviteToken?: string;
  invitedAt?: any;

  activatedAt?: any;
  activatedByUid?: string;

  createdAt?: any;
  updatedAt?: any;
};

const COL = "memberships";

export type CreateMembershipDTO = Omit<
  Membership,
  "id" | "createdAt" | "updatedAt" | "invitedAt" | "activatedAt"
> & {
  inviteToken: string; // obrigatório no create (para convite)
};

export async function listMemberships(): Promise<Membership[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

export async function listMembershipsByPerson(personId: string): Promise<Membership[]> {
  const q = query(collection(db, COL), where("personId", "==", personId));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Membership, "id">),
  }));
}

export async function createMembership(data: CreateMembershipDTO): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    personId: data.personId,
    ministryId: data.ministryId,
    role: data.role,
    status: data.status,
    inviteToken: data.inviteToken,
    invitedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updateMembership(
  id: string,
  data: Partial<Omit<Membership, "id" | "createdAt">>
) {
  await updateDoc(doc(db, COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
