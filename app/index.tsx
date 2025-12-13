import { Redirect } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";

export default function Index() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (user.role === "ADMIN") {
    return <Redirect href="/admin/dashboard" />;
  }

  if (user.role === "LEADER") {
    return <Redirect href="/leader/dashboard" />;
  }

  return <Redirect href="/member/dashboard" />;
}
