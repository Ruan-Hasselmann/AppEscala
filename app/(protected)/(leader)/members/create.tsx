import AppInput from "@/src/components/AppInput";
import { useAuth } from "@/src/contexts/AuthContext";
import { createInvite } from "@/src/services/invites";
import { sendInviteWhatsApp } from "@/src/utils/sendInviteWhatsApp";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function CreateMember() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "leader">("member");
  const [phone, setPhone] = useState("");

  async function handleCreate() {
    if (!user?.ministryId) return;

    const inviteId = await createInvite({
      name,
      email,
      role,
      ministryId: user.ministryId,
    });

    sendInviteWhatsApp(inviteId, name, phone);
  }

  return (
    <View style={{ padding: 16 }}>
      <Text>Nome</Text>
      <AppInput value={name} onChangeText={setName} />

      <Text>Email</Text>
      <AppInput value={email} onChangeText={setEmail} />

      <Text>Telefone (WhatsApp)</Text>
      <AppInput value={phone} onChangeText={setPhone} />

      <TouchableOpacity onPress={handleCreate}>
        <Text>Enviar convite</Text>
      </TouchableOpacity>
    </View>
  );
}
