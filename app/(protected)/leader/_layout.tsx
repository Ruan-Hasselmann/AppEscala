import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";

export default function LeaderLayout() {
  const { user } = useAuth();

  if (user?.role !== "LEADER" && user?.role !== "ADMIN") {
    return <Redirect href="/member/dashboard" />;
  }

  return <Slot />;
}
