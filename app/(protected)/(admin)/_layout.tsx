import { useAuth } from "@/src/contexts/AuthContext";
import { Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (!user || user.role !== "admin") {
    // Proteção extra (não deveria acontecer)
    return null;
  }

  return <Slot />;
}
