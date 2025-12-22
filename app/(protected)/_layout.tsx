// app/(protected)/_layout.tsx
import { Redirect, Stack, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";

const ROLE_ROOT = {
  admin: "/(protected)/(admin)/dashboard",
  leader: "/(protected)/(leader)/dashboard",
  member: "/(protected)/(member)/dashboard",
} as const;

export default function ProtectedLayout() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* =========================
     NÃO AUTENTICADO → BLOQUEIO TOTAL
  ========================= */

  if (!user) {
    return <Redirect href="/login" />;
  }

  const roleRoot = ROLE_ROOT[user.role];

  if (!roleRoot) {
    return <Redirect href="/login" />;
  }

  /* =========================
     REDIRECT ROOT /protected
  ========================= */

  if (pathname === "/(protected)") {
    return <Redirect href={roleRoot} />;
  }

  /* =========================
     BLOQUEIO POR ROLE
  ========================= */

  if (user.role === "member") {
    if (pathname.includes("(admin)") || pathname.includes("(leader)")) {
      return <Redirect href={roleRoot} />;
    }
  }

  if (user.role === "leader") {
    if (pathname.includes("(admin)")) {
      return <Redirect href={roleRoot} />;
    }
  }

  /* =========================
     AUTORIZADO → RENDERIZA STACK
  ========================= */

  return <Stack screenOptions={{ headerShown: false }} />;
}
