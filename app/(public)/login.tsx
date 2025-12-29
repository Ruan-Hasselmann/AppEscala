// src/app/(public)/login.tsx
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

/* =========================
   COMPONENT
========================= */

export default function LoginScreen() {
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
     ACTION
  ========================= */

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleLogin() {
    setError(null);

    if (!email || !password) {
      setError("Informe email e senha");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Informe um email válido");
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim().toLowerCase(), password);
      // ⚠️ navegação será tratada depois (guards)
    } catch (err: any) {
      setError("Email ou senha inválidos");
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Entrar</Text>

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

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.button,
            (submitting || loading) && { opacity: 0.6 },
          ]}
          onPress={handleLogin}
          disabled={submitting || loading}
        >
          <Text style={styles.buttonText}>
            {submitting ? "Entrando..." : "Entrar"}
          </Text>
        </TouchableOpacity>

        <Link href="/forgot-password" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkTextForgot}>
              Esqueci minha senha
            </Text>
          </TouchableOpacity>
        </Link>

        <Link href="/register" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>
              Criar conta
            </Text>
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
  linkTextForgot: {
    fontWeight: "700",
    color: "#DC2626",
  },
});
