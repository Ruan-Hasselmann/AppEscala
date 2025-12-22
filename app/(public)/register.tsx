import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "@/src/contexts/AuthContext";

export default function RegisterScreen() {
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleRegister() {
    setError(null);

    if (!name || !email || !password) {
      setError("Preencha todos os campos");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Informe um email válido");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }

    try {
      setSubmitting(true);
      await register({ name, email, password });
    } catch (err: any) {
      setError("Erro ao criar conta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Criar conta</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#6B7280"
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={[
            styles.input,
            error?.includes("email") && { borderColor: "#DC2626" },
          ]}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar senha"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, submitting && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Criando..." : "Criar conta"}
          </Text>
        </TouchableOpacity>

        <Link href="/login" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>Já tenho conta</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },
  error: {
    color: "#DC2626",
    marginBottom: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  linkBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  linkText: {
    fontWeight: "700",
    color: "#2563EB",
  },
});
