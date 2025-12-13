import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";

export default function MemberLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== "member") {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
