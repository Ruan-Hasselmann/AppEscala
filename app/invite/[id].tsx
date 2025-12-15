import { useLocalSearchParams, useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth, db } from "../../src/services/firebase";
import { getInvite, markInviteAsUsed } from "../../src/services/invites";
import AppInput from "@/src/components/AppInput";

export default function InvitePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<any>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    getInvite(id!).then(setInvite).catch(console.error);
  }, []);

  async function handleAccept() {
    if (!invite || invite.used) return;

    const cred = await createUserWithEmailAndPassword(
      auth,
      invite.email,
      password
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      name: invite.name,
      email: invite.email,
      role: invite.role,
      ministryId: invite.ministryId,
    });

    await markInviteAsUsed(id!);

    router.replace("/login");
  }

  if (!invite) return <Text>Carregando...</Text>;
  if (invite.used) return <Text>Convite já utilizado.</Text>;

  return (
    <View style={{ padding: 16 }}>
      <Text>Bem-vindo, {invite.name}</Text>

      <AppInput
        placeholder="Crie sua senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity onPress={handleAccept}>
        <Text>Criar acesso</Text>
      </TouchableOpacity>
    </View>
  );
}
