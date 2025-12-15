import AppBottomNav from "@/src/components/AppBottomNav";
import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";
import AppScreen from "../../src/components/AppScreen";

export default function ProtectedLayout() {
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
});
