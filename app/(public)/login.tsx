import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../src/contexts/AuthContext";

export default function Login() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    console.log("👉 Cliquei em Entrar");
    console.log("Email:", email);
    console.log("Senha:", password);

    try {
      setError("");
      await login(email.trim(), password);
      console.log("✅ login() retornou sem erro");
    } catch (e) {
      console.error("❌ Erro no handleLogin:", e);
      setError("Email ou senha inválidos");
    }
  }


  /* 🔑 REDIRECIONAMENTO CORRETO */
  useEffect(() => {
    if (!loading && user) {
      router.replace("/"); // 👈 index decide a rota pelo role
    }
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escala App</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor="#6B7280"
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Senha"
        placeholderTextColor="#6B7280"
        secureTextEntry
        style={styles.input}
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

/* estilos mantidos */
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    color: "#111827",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 8,
  },
});