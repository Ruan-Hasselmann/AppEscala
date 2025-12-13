import { Redirect } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();

  // 🔒 BLOQUEIA QUALQUER REDIRECT enquanto carrega
  if (loading) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  // 🔥 SEM DEFAULT
  if (user.role === "admin") {
    return <Redirect href="/(protected)/(admin)/dashboard" />;
  }

  if (user.role === "leader") {
    return <Redirect href="/(protected)/(leader)/dashboard" />;
  }

  if (user.role === "member") {
    return <Redirect href="/(protected)/(member)/dashboard" />;
  }

  // 🚨 fallback de segurança
  return <Redirect href="/login" />;
}
