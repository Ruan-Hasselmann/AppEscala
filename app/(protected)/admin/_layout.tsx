import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";

export default function AdminLayout() {
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return <Redirect href="/member/dashboard" />;
  }

  return <Slot />;
}
