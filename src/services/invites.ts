import {
  addDoc,
  collection,
  doc,
  getDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type InviteRole = "member" | "leader";

export type Invite = {
  id: string;
  name: string;
  email: string;
  role: InviteRole;
  ministryId: string;
  used: boolean;
};

export async function createInvite(data: {
  name: string;
  email: string;
  role: InviteRole;
  ministryId: string;
}) {
  const ref = await addDoc(collection(db, "invites"), {
    ...data,
    used: false,
    createdAt: Timestamp.now(),
  });

  return ref.id;
}

export async function getInvite(inviteId: string): Promise<Invite> {
  const ref = doc(db, "invites", inviteId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error("Convite inválido");
  }

  return {
    id: snap.id,
    ...(snap.data() as Omit<Invite, "id">),
  };
}

export async function markInviteAsUsed(inviteId: string) {
  await updateDoc(doc(db, "invites", inviteId), {
    used: true,
  });
}
