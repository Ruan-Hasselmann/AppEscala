import { useLocalSearchParams, useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../src/services/firebase";

export default function Register() {
  const { personId } = useLocalSearchParams<{ personId: string }>();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function waitForAuth(): Promise<string> {
    return new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user.uid);
        }
      });

      setTimeout(() => {
        unsub();
        reject(new Error("Timeout de autenticação"));
      }, 8000);
    });
  }

  async function register() {
    if (!personId || !password) {
      Alert.alert("Erro", "Dados inválidos");
      return;
    }

    setLoading(true);

    try {
      const ref = doc(db, "people", personId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        Alert.alert("Erro", "Convite inválido");
        return;
      }

      const person = snap.data();

      // 🔐 CRIA USUÁRIO NO AUTH
      await createUserWithEmailAndPassword(
        auth,
        person.email,
        password
      );

      Alert.alert(
        "Conta criada",
        "Agora faça login para continuar"
      );

      router.replace("/login");
    } catch (e: any) {
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ativar conta</Text>

      <TextInput
        placeholder="Crie uma senha"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={styles.save}
        onPress={register}
        disabled={loading}
      >
        <Text style={styles.saveText}>
          {loading ? "Criando..." : "Criar conta"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  save: {
    backgroundColor: "#065F46",
    padding: 16,
    borderRadius: 12,
  },
  saveText: {
    color: "#fff",
    fontWeight: "800",
    textAlign: "center",
  },
});
