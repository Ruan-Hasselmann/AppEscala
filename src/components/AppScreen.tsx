import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import {
  useSafeAreaInsets
} from "react-native-safe-area-context";

type AppScreenProps = {
  children: ReactNode;
};

export function AppScreen({ children }: AppScreenProps) {
  const insets = useSafeAreaInsets();

  return (
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom, // ✅ tabs / nav android
          },
        ]}
      >
        {children}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
