import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../../src/contexts/AuthContext";

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || user.role !== "admin") {
    return <Redirect href="/" />;
  }

  return <Slot />;
}
