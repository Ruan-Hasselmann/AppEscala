import { useLocalSearchParams, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { auth } from "../src/services/firebase";
import {
  acceptInvite,
  getMembershipById,
} from "../src/services/memberships";
import { createUserProfile } from "../src/services/users";
import ConfirmModal from "./(protected)/(admin)/components/ConfirmModal";

export default function Register() {
  const { membershipId, token } = useLocalSearchParams<{
    membershipId?: string;
    token?: string;
  }>();

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);

  // 🔐 dados vindos EXCLUSIVAMENTE do convite
  const [email, setEmail] = useState("");
  const [membershipEmail, setMembershipEmail] = useState("");
  const [personName, setPersonName] = useState("");
  const [ministryName, setMinistryName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [membershipRole, setMembershipRole] = useState<"leader" | "member">("member");

  const [confirm, setConfirm] = useState<{
    title: string;
    message?: string;
  } | null>(null);

  /**
   * 🔍 Validação do convite
   */
  useEffect(() => {
    async function validateInvite() {
      try {
        if (!membershipId || !token) return;

        const mem = await getMembershipById(membershipId);

        if (!mem || mem.status !== "invited" || mem.inviteToken !== token) {
          return;
        }

        // ✅ FONTE ÚNICA: membership
        if (!mem.personEmail) return;

        setEmail(mem.personEmail);
        setMembershipEmail(mem.personEmail);
        setPersonName(mem.personName ?? "Convidado");
        setMinistryName(mem.ministryName ?? "");
        setRoleLabel(mem.role === "leader" ? "Líder" : "Membro");
        setMembershipRole(mem.role);

        setValid(true);
      } finally {
        setLoading(false);
      }
    }

    validateInvite();
  }, [membershipId, token]);

  /**
   * 🧾 Finaliza cadastro
   */
  async function handleRegister() {
    if (!password || password.length < 6) {
      setConfirm({
        title: "Senha inválida",
        message: "A senha deve ter no mínimo 6 caracteres.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setConfirm({
        title: "Erro",
        message: "As senhas não coincidem.",
      });
      return;
    }

    const finalEmail = membershipEmail || email;

    if (!finalEmail) {
      setConfirm({
        title: "Erro",
        message: "Email do convite não encontrado.",
      });
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        finalEmail,
        password
      );

      // ✅ ativa o convite
      await acceptInvite({
        membershipId: membershipId!,
        uid: cred.user.uid,
      });

      await createUserProfile({
        uid: cred.user.uid,
        email,
        role: membershipRole === "leader" ? "leader" : "member",
      })

      setConfirm({
        title: "Conta criada",
        message: "Seu cadastro foi concluído com sucesso.",
      });

      setTimeout(() => {
        router.replace("/");
      }, 1200);
    } catch (e: any) {
      setConfirm({
        title: "Erro",
        message: e?.message ?? "Falha ao criar conta.",
      });
    }
  }

  /**
   * ⏳ Loading
   */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  /**
   * ❌ Convite inválido
   */
  if (!valid) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Convite inválido ou expirado</Text>
      </View>
    );
  }

  /**
   * ✅ Tela de registro
   */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finalizar cadastro</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>👤 {personName}</Text>
        <Text style={styles.infoText}>🎯 {ministryName}</Text>
        <Text style={styles.infoText}>🔑 {roleLabel}</Text>
      </View>

      <TextInput style={styles.input} value={email} editable={false} />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar senha"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <Pressable style={styles.primary} onPress={handleRegister}>
        <Text style={styles.primaryText}>Criar conta</Text>
      </Pressable>

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message}
        onConfirm={() => setConfirm(null)}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 18,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  infoText: {
    fontWeight: "700",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  primary: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },
  error: {
    color: "#DC2626",
    fontWeight: "800",
  },
});
