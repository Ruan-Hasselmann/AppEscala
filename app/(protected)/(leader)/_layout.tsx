import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";

export default function LeaderLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== "leader") {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
