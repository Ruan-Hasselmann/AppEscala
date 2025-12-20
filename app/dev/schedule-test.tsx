import { generateScheduleForMinistries } from "@/src/services/schedule/generateScheduleForMinistries";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import { buildScheduleInput } from "../../src/services/schedule/adapters/buildScheduleInput";
import { loadScheduleDataFromFirestore } from "../../src/services/schedule/adapters/loadScheduleData";

export default function ScheduleTestScreen() {
    async function runTest() {
        console.clear();
        console.log("🔄 Carregando dados do Firestore...");

        const { ministries, people, memberships } =
            await loadScheduleDataFromFirestore();

        console.log("📌 Ministérios:", ministries.length);
        console.log("👥 Pessoas:", people.length);
        console.log("🧾 Memberships:", memberships.length);

        const { ministriesInput } = buildScheduleInput({
            ministries,
            people,
            memberships,
        });

        const dates = ["2025-12-21"]; // 🔒 fixa para teste

        const result = generateScheduleForMinistries({
            dates,
            ministries: ministriesInput,
        });

        console.log("====== PREVIEW ESCALA (FIRESTORE) ======");
        console.table(result);
    }
    return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", marginBottom: 12 }}>
                Teste — Geração de Escala
            </Text>

            <Text style={{ marginBottom: 16 }}>
                Esta tela serve apenas para validar a lógica da escala sem Firestore.
                Verifique o console após executar.
            </Text>

            <TouchableOpacity
                onPress={runTest}
                style={{
                    backgroundColor: "#2563EB",
                    padding: 14,
                    borderRadius: 10,
                }}
            >
                <Text style={{ color: "#FFF", textAlign: "center", fontWeight: "700" }}>
                    Executar teste
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
