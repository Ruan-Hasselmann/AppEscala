import AppScreen from "@/src/components/AppScreen";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import { createMember } from "../../../src/services/members";

export default function CreateMember() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name || !email || !password) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    if (!user?.ministryId) {
      Alert.alert("Erro", "Ministério não encontrado");
      return;
    }

    try {
      setLoading(true);

      await createMember({
        name,
        email,
        password,
        ministryId: user.ministryId, // 🔥 automático
      });


      Alert.alert("Sucesso", "Membro cadastrado com sucesso");

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível cadastrar o membro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen>
      <Text style={styles.title}>Cadastrar Membro</Text>

      <TextInput
        placeholder="Nome"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        placeholder="Senha temporária"
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Salvando..." : "Cadastrar"}
        </Text>
      </TouchableOpacity>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1E3A8A",
    padding: 14,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
});
