import { useAuth } from "@/src/contexts/AuthContext";
import { Redirect, Stack } from "expo-router";

const ROLE_ROOT = {
  admin: "/(protected)/(admin)/dashboard",
  leader: "/(protected)/(leader)/dashboard",
  member: "/(protected)/(member)/schedule",
} as const;

export default function PublicLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    return <Redirect href={ROLE_ROOT[user.role]} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
