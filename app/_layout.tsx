import { Stack } from "expo-router";
import { AuthProvider } from "../src/contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(protected)" />
      </Stack>
    </AuthProvider>
  );
}
