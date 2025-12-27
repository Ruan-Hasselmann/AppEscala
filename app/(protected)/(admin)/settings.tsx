import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { getAppSettings, saveAppSettings } from "@/src/services/settings";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

/* =========================
   SCREEN
========================= */

export default function AdminSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<{
    openDay: number;
    closeDay: number;
  }>({ openDay: 20, closeDay: 28 });

  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  /* =========================
     LOAD SETTINGS
  ========================= */

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const s = await getAppSettings();
        setSettings({
          openDay: s.availability.openDay,
          closeDay: s.availability.closeDay,
        });
      }
      load();
    }, [])
  );

  /* =========================
     ACTIONS
  ========================= */

  async function handleSaveAvailability() {
    if (
      settings.openDay < 1 ||
      settings.openDay > 31 ||
      settings.closeDay < 1 ||
      settings.closeDay > 31 ||
      settings.openDay >= settings.closeDay
    ) {
      return;
    }

    await saveAppSettings({
      availability: {
        openDay: settings.openDay,
        closeDay: settings.closeDay,
      },
    });

    setShowAvailabilityModal(false);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <AppScreen>
      <AppHeader
        title="Configurações"
        subtitle={`${user?.name} · Administrador`}
        onLogout={logout}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* PERFIL */}
        <Section title="Meu Perfil">
          <InfoRow label="Nome" value={user?.name ?? ""} />
          <InfoRow label="E-mail" value={user?.email ?? ""} />
          <InfoRow label="Papel" value="Administrador Geral" />
        </Section>

        {/* ORGANIZAÇÃO */}
        <Section title="Organização">
          <SettingItem
            title="Pessoas"
            description="Gerencie membros e líderes"
            onPress={() =>
              router.push("/(protected)/(admin)/people")
            }
          />

          <SettingItem
            title="Ministérios"
            description="Crie e organize os ministérios"
            onPress={() =>
              router.push(
                "/(protected)/(admin)/ministries/ministries"
              )
            }
          />
        </Section>

        {/* DISPONIBILIDADE */}
        <Section title="Disponibilidade">
          <SettingItem
            title="Período de disponibilidade"
            description={`Aberto do dia ${settings.openDay} até ${settings.closeDay}`}
            onPress={() => setShowAvailabilityModal(true)}
          />
        </Section>

        {/* ESCALAS */}
        <Section title="Regras de Escala">
          <SettingItem
            title="Regras de Escala"
            description="Defina regras gerais para a geração das escalas"
            badge="Em breve"
            disabled
          />
        </Section>

        {/* SOBRE */}
        <Section title="Sobre o sistema">
          <InfoRow label="Aplicativo" value="App de Escalas" />
          <InfoRow label="Versão" value="1.0.0" />
          <Text style={styles.about}>
            Sistema desenvolvido para facilitar a organização de escalas
            e o cuidado com pessoas nos ministérios.
          </Text>
        </Section>
      </ScrollView>

      {/* MODAL DISPONIBILIDADE */}
      <Modal visible={showAvailabilityModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Período de Disponibilidade
            </Text>

            <Text style={styles.modalDesc}>
              Defina os dias do mês atual em que os membros poderão informar
              a disponibilidade para o mês seguinte.
            </Text>

            <View style={styles.row}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Abre no dia</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={String(settings.openDay)}
                  onChangeText={(v) =>
                    setSettings((s) => ({
                      ...s,
                      openDay: Number(v),
                    }))
                  }
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fecha no dia</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={String(settings.closeDay)}
                  onChangeText={(v) =>
                    setSettings((s) => ({
                      ...s,
                      closeDay: Number(v),
                    }))
                  }
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={handleSaveAvailability}
            >
              <Text style={styles.primaryText}>Salvar</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setShowAvailabilityModal(false)}
            >
              <Text style={styles.secondaryText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

/* =========================
   COMPONENTS
========================= */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function SettingItem({
  title,
  description,
  badge,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  badge?: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.item, disabled && { opacity: 0.5 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDesc}>{description}</Text>
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        <Text style={styles.chevron}>›</Text>
      )}
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  section: { marginBottom: 24 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
    marginBottom: 8,
  },

  sectionCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  itemTitle: { fontWeight: "800", color: "#111827" },
  itemDesc: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  chevron: { fontSize: 22, fontWeight: "700", color: "#9CA3AF" },

  badge: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  badgeText: { fontSize: 12, fontWeight: "700", color: "#374151" },

  infoRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  infoLabel: { fontSize: 12, color: "#6B7280" },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },

  about: {
    padding: 14,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modal: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: { fontSize: 18, fontWeight: "900" },
  modalDesc: {
    fontSize: 13,
    color: "#6B7280",
    marginVertical: 12,
  },

  row: { flexDirection: "row", gap: 12 },

  inputGroup: { flex: 1 },

  label: { fontSize: 12, fontWeight: "700", marginBottom: 4 },

  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    fontWeight: "700",
  },

  primaryBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  },

  primaryText: { color: "#FFF", fontWeight: "800" },

  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
  },

  secondaryText: { color: "#6B7280", fontWeight: "700" },
});
