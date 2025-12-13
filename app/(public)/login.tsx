import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

export default function Login() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    try {
      console.log("👉 Cliquei em Entrar");
      setError("");
      await login(email, password);
      console.log("⏭ Login retornou sem erro");
    } catch (err) {
      console.error("❌ Erro no login:", err);
      setError("Email ou senha inválidos");
    }
  }

  useEffect(() => {
    console.log("🧭 Login effect:", { loading, user });

    if (!loading && user) {
      console.log("🚀 Navegando para /");
      router.replace("/");
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escala App</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Senha"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  error: { color: "red", textAlign: "center", marginBottom: 8 },
});
