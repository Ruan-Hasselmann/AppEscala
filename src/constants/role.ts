// src/constants/roles.ts

export type SystemRole = "admin" | "leader" | "member";

export const SYSTEM_ROLE_LABEL: Record<SystemRole, string> = {
  admin: "Administrador",
  leader: "Líder",
  member: "Membro",
};
