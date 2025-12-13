export type UserRole = "MEMBER" | "LEADER" | "ADMIN";

export type AppUser = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  ministryId?: string;
};
