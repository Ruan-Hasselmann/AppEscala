import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  onLogout?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  onLogout,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12, // ✅ status bar segura
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>

      {onLogout && (
        <TouchableOpacity
          onPress={onLogout}
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Sair</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#6B7280",
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
  },
  logoutText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
  },
});
