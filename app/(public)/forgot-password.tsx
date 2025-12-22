// app/(public)/forgot-password.tsx
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

import { auth } from "@/src/services/firebase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Informe seu email");
      return;
    }

    try {
      setLoading(true);
      await auth.sendPasswordResetEmail(email.trim().toLowerCase());
      setSuccess(
        "Enviamos um email com instruções para redefinir sua senha"
      );
    } catch (err: any) {
      console.error("RESET PASSWORD ERROR:", err);

      if (err.code === "auth/user-not-found") {
        setError("Nenhuma conta encontrada com este email");
      } else if (err.code === "auth/invalid-email") {
        setError("Email inválido");
      } else {
        setError("Erro ao enviar email de recuperação");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Recuperar senha</Text>

        <Text style={styles.subtitle}>
          Informe seu email para receber o link de redefinição
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Enviando..." : "Enviar email"}
          </Text>
        </TouchableOpacity>

        <Link href="/login" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>Voltar para login</Text>
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
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#6B7280",
    marginBottom: 16,
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
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  success: {
    color: "#16A34A",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  linkBtn: {
    marginTop: 14,
    alignItems: "center",
  },
  linkText: {
    fontWeight: "700",
    color: "#2563EB",
  },
});
