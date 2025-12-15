import { Linking } from "react-native";

export function sendInviteWhatsApp(
  inviteId: string,
  name: string,
  phone?: string
) {
  const link = `https://seu-dominio.com/invite/${inviteId}`;

  const message = encodeURIComponent(
    `Olá ${name}! 👋\n\n` +
      `Você foi convidado para participar do *Escala App*.\n\n` +
      `👉 Crie seu acesso aqui:\n${link}`
  );

  const url = phone
    ? `https://wa.me/55${phone}?text=${message}`
    : `https://wa.me/?text=${message}`;

  Linking.openURL(url);
}
