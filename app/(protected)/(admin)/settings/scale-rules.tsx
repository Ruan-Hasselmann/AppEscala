import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { StyleSheet, Text, View } from "react-native";

export default function AdminScaleRules() {
  const { user, logout } = useAuth();

  return (
    <AppScreen>
      <AppHeader
        title="Regras de Escala"
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />

      <View style={styles.container}>
        <Text style={styles.title}>
          Regras gerais de escala
        </Text>

        <Text style={styles.desc}>
          Aqui você poderá definir regras que ajudam a distribuir
          as escalas de forma justa e organizada.
        </Text>

        <View style={styles.card}>
          <Text style={styles.item}>• Evitar domingos consecutivos</Text>
          <Text style={styles.item}>• Limite de escalas por período</Text>
          <Text style={styles.item}>• Exceções manuais com registro</Text>
          <Text style={styles.item}>• Confirmação de presença</Text>
        </View>

        <Text style={styles.soon}>
          🚧 Configuração das regras será implementada em breve.
        </Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    color: "#111827",
  },

  desc: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },

  item: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  soon: {
    fontSize: 13,
    color: "#6B7280",
    fontStyle: "italic",
  },
});
