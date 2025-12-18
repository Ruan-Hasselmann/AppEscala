import AppScreen from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { router, Slot, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

const ROLE_GROUP_MAP = {
  admin: "(admin)",
  leader: "(leader)",
  member: "(member)",
} as const;

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const expectedGroup = ROLE_GROUP_MAP[user.role];
    const currentGroup = segments[1]; // "(admin)" | "(leader)" | "(member)"

    if (currentGroup !== expectedGroup) {
      // redireciona para uma rota REAL
      router.replace(`/(protected)/${expectedGroup}/dashboard` as any);
    }
  }, [loading, user, segments]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) return null;

  return (
    <AppScreen>
      <View style={styles.content}>
        <Slot />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
