import { AppHeader } from "@/src/components/AppHeader";
import { AppScreen } from "@/src/components/AppScreen";
import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter } from "expo-router";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

/* =========================
   SCREEN
========================= */

export default function AdminSettings() {
    const { user, logout } = useAuth();
    const router = useRouter();

    return (
        <AppScreen>
            <AppHeader
                title="Configurações"
                subtitle={`${user?.name} · Administrador`}
                onLogout={logout}
            />

            <ScrollView contentContainerStyle={styles.container}>
                {/* =========================
            PERFIL
        ========================= */}
                <Section title="Meu Perfil">
                    <InfoRow label="Nome" value={user?.name ?? ""} />
                    <InfoRow label="E-mail" value={user?.email ?? ""} />
                    <InfoRow label="Papel" value="Administrador Geral" />
                </Section>

                {/* =========================
            ORGANIZAÇÃO
        ========================= */}
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
                            router.push("/(protected)/(admin)/ministries/ministries")
                        }
                    />

                    <SettingItem
                        title="Lideranças"
                        description="Definir responsáveis e líderes principais"
                        badge="Em breve"
                        disabled
                    />
                </Section>

                {/* =========================
                            ESCALAS
                    ========================= */}
                <Section title="Regras de Escala">
                    <SettingItem
                        title="Regras de Escala"
                        description="Defina regras gerais para a geração das escalas"
                        onPress={() =>
                            router.push("/(protected)/(admin)/settings/scale-rules")
                        }
                    />

                    <SettingItem
                        title="Evitar escalas consecutivas"
                        description="Bloqueia a mesma pessoa em domingos seguidos"
                        badge="Em breve"
                        disabled
                    />

                    <SettingItem
                        title="Limite por período"
                        description="Define quantas escalas por mês cada pessoa pode ter"
                        badge="Em breve"
                        disabled
                    />

                    <SettingItem
                        title="Exceção pastoral"
                        description="Permitir ajustes manuais com justificativa"
                        badge="Em breve"
                        disabled
                    />

                    <SettingItem
                        title="Confirmação de presença"
                        description="Membros confirmam se poderão servir"
                        badge="Em breve"
                        disabled
                    />
                </Section>

                {/* =========================
            COMUNICAÇÃO
        ========================= */}
                <Section title="Comunicação">
                    <SettingItem
                        title="Notificações"
                        description="Avisos sobre escalas e alterações"
                        badge="Em breve"
                        disabled
                    />

                    <SettingItem
                        title="Avisar líderes"
                        description="Notificar líderes sobre recusas ou mudanças"
                        badge="Em breve"
                        disabled
                    />
                </Section>

                {/* =========================
            SEGURANÇA
        ========================= */}
                <Section title="Permissões">
                    <SettingItem
                        title="Quem pode gerar escalas"
                        description="Controlar quem pode criar e publicar escalas"
                        badge="Em breve"
                        disabled
                    />

                    <SettingItem
                        title="Quem pode editar pessoas"
                        description="Definir permissões de edição"
                        badge="Em breve"
                        disabled
                    />
                </Section>

                {/* =========================
            SOBRE
        ========================= */}
                <Section title="Sobre o sistema">
                    <InfoRow label="Aplicativo" value="App de Escalas" />
                    <InfoRow label="Versão" value="1.0.0" />
                    <Text style={styles.about}>
                        Sistema desenvolvido para facilitar a organização de escalas
                        e o cuidado com pessoas nos ministérios.
                    </Text>
                </Section>
            </ScrollView>
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
            style={[
                styles.item,
                disabled && { opacity: 0.5 },
            ]}
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

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
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
    container: {
        padding: 16,
        paddingBottom: 40,
    },

    section: {
        marginBottom: 24,
    },

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

    itemTitle: {
        fontWeight: "800",
        color: "#111827",
    },

    itemDesc: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },

    chevron: {
        fontSize: 22,
        fontWeight: "700",
        color: "#9CA3AF",
    },

    badge: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },

    badgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#374151",
    },

    infoRow: {
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },

    infoLabel: {
        fontSize: 12,
        color: "#6B7280",
    },

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
});
