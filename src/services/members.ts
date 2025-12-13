import { db } from "./firebase";

type CreateMemberParams = {
  name: string;
  email: string;
  password: string;
  ministryId: string;
};

export async function createMember({
  name,
  email,
  password,
  ministryId,
}: {
  name: string;
  email: string;
  password: string;
  ministryId: string;
}) {
  const ref = db.collection("users").doc();

  await ref.set({
    uid: ref.id,
    name,
    email,
    role: "MEMBER",
    ministryId, // 🔥 vem do líder
    tempPassword: password,
    mustChangePassword: true,
    createdAt: new Date(),
  });
}
