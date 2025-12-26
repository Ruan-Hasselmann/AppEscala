import { useAuth } from "@/src/contexts/AuthContext";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.role === "admin") {
      router.replace("/(protected)/(admin)/dashboard");
      return;
    }

    if (user.role === "leader") {
      router.replace("/(protected)/(leader)/dashboard");
      return;
    }

    router.replace("/(protected)/(member)/dashboard");
  }, [loading, user?.role]);

  // 🔒 Enquanto decide rota, não renderiza nada
  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
