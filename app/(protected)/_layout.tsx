import { Redirect, Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

export default function ProtectedLayout() {
  const { user, loading } = useAuth();

  // Enquanto verifica auth
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // ❌ NÃO LOGADO → LOGIN
  if (!user) {
    return <Redirect href="/login" />;
  }

  // ✅ LOGADO → libera acesso
  return <Slot />;
}
