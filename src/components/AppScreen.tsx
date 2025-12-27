import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
};

export function AppScreen({ children }: Props) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["bottom"]} // 👈 CRÍTICO
    >
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginBottom: -50,
  },
});
