import { TIMEZONES } from "@/src/utils/timezones";
import { useEffect, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    getSystemSettings,
    saveSystemSettings,
    SystemSettings,
} from "../../../src/services/settings";

const DEFAULT: SystemSettings = {
    churchName: "",
    timezone: "America/Sao_Paulo",
    availabilityDeadlineDay: 25,
    allowConsecutiveWeeks: false,
    maxSchedulesPerMonth: 2,
    defaultTurns: ["morning", "night"],
};

export default function AdminSettings() {
    const [form, setForm] = useState<SystemSettings>(DEFAULT);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function load() {
            const data = await getSystemSettings();
            if (data) setForm({ ...DEFAULT, ...data });
            setLoading(false);
        }
        load();
    }, []);

    async function save() {
        setSaving(true);
        await saveSystemSettings(form);
        setSaving(false);
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Carregando…</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Configurações do Sistema</Text>

            <Text style={styles.label}>Nome da Igreja</Text>
            <TextInput
                style={styles.input}
                value={form.churchName}
                onChangeText={(t) => setForm((p) => ({ ...p, churchName: t }))}
            />

            <Text style={styles.label}>Fuso horário</Text>

            <View style={styles.row}>
                {TIMEZONES.map((tz) => (
                    <Pressable
                        key={tz.value}
                        style={[
                            styles.option,
                            form.timezone === tz.value && styles.optionActive,
                        ]}
                        onPress={() =>
                            setForm((p) => ({ ...p, timezone: tz.value }))
                        }
                    >
                        <Text
                            style={[
                                styles.optionText,
                                form.timezone === tz.value && { color: "#FFFFFF" },
                            ]}
                        >
                            {tz.label}
                        </Text>
                    </Pressable>
                ))}
            </View>


            <Text style={styles.label}>Dia limite da disponibilidade</Text>

            <View style={styles.daysGrid}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <Pressable
                        key={day}
                        style={[
                            styles.dayCell,
                            form.availabilityDeadlineDay === day && styles.dayActive,
                        ]}
                        onPress={() =>
                            setForm((p) => ({ ...p, availabilityDeadlineDay: day }))
                        }
                    >
                        <Text
                            style={[
                                styles.dayText,
                                form.availabilityDeadlineDay === day && { color: "#FFFFFF" },
                            ]}
                        >
                            {day}
                        </Text>
                    </Pressable>
                ))}
            </View>


            <Text style={styles.label}>Máximo de escalas por mês</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(form.maxSchedulesPerMonth)}
                onChangeText={(t) =>
                    setForm((p) => ({
                        ...p,
                        maxSchedulesPerMonth: Number(t),
                    }))
                }
            />

            <TouchableOpacity style={styles.save} onPress={save}>
                <Text style={styles.saveText}>
                    {saving ? "Salvando..." : "Salvar configurações"}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },
    title: { fontSize: 22, fontWeight: "900", marginBottom: 16 },
    label: { fontWeight: "800", marginTop: 12, marginBottom: 4 },
    input: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        padding: 12,
    },
    save: {
        marginTop: 24,
        backgroundColor: "#1E3A8A",
        padding: 14,
        borderRadius: 12,
    },
    saveText: {
        color: "#FFFFFF",
        fontWeight: "900",
        textAlign: "center",
    },
    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    option: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: "#E5E7EB",
    },
    optionActive: {
        backgroundColor: "#1E3A8A",
    },
    optionText: {
        fontWeight: "800",
        color: "#111827",
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 6,
    },
    dayCell: {
        width: 42,
        height: 42,
        borderRadius: 8,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
    },
    dayActive: {
        backgroundColor: "#1E3A8A",
    },
    dayText: {
        fontWeight: "800",
        color: "#111827",
    },
    logout: {
        marginTop: 16,
        backgroundColor: "#991B1B",
        paddingVertical: 14,
        borderRadius: 12,
    },
    logoutText: { color: "#FFFFFF", fontWeight: "900", textAlign: "center" },

});
