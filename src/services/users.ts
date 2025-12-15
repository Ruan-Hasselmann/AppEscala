import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type UserRole = "admin" | "leader" | "member";

export async function getUserRole(uid: string): Promise<UserRole | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().role ?? null;
}

export async function setUserRole(uid: string, role: UserRole) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await updateDoc(ref, {
    role,
    updatedAt: serverTimestamp(),
  });
}
