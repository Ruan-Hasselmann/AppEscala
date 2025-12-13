import { ReactNode } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import AppBottomNav from "./AppBottomNav"; // Componente de navegação fixo

type Props = {
  children: ReactNode;
  scroll?: boolean; // Se quiser desabilitar o scroll em alguma tela específica
};

export default function AppScreen({ children, scroll = true }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Conteúdo rolável se "scroll" for true */}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.container}>{children}</View>
      )}

      {/* Bottom nav fixa */}
      <AppBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Fundo branco
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 0,
    paddingBottom: 96, // Garante que o conteúdo não fique escondido atrás do bottom nav
  },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 0,
  },
});
