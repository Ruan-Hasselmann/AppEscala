import { Redirect } from "expo-router";
import { useAuth } from "../src/contexts/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Redirect href="/login" />;
  }

  switch (user.role) {
    case "admin":
      return <Redirect href="/(protected)/(admin)/dashboard" />;
    case "leader":
      return <Redirect href="/(protected)/(leader)/dashboard" />;
    default:
      return <Redirect href="/(protected)/(member)/dashboard" />;
  }
}
