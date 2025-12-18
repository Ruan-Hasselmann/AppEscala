import { useMemo, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import { consolidateMonthSchedule } from "../../../src/services/adminSchedule";
import { getMonthKey, getMonthName } from "../../../src/utils/calendar";

/* =========================
   UTILS
========================= */

function getNextMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/* =========================
   COMPONENT
========================= */

export default function AdminConsolidation() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return null;

  const targetDate = useMemo(() => getNextMonth(), []);
  const monthKey = getMonthKey(targetDate);
  const monthLabel = getMonthName(
    targetDate.getFullYear(),
    targetDate.getMonth()
  );

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =========================
     ACTIONS
  ========================= */

  async function handleConfirmConsolidation() {
    try {
      setLoading(true);
      setError(null);

      await consolidateMonthSchedule(monthKey);

      setDone(true);
      setConfirmOpen(false);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao consolidar escala");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>Consolidação da Escala</Text>
      <Text style={styles.subtitle}>
        Publicação da escala geral do mês
      </Text>

      {/* INFO CARD */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Mês alvo</Text>
        <Text style={styles.infoValue}>{monthLabel}</Text>

        <Text style={styles.infoText}>
          Esta ação consolida todas as escalas geradas pelos líderes de
          ministério e publica a escala geral do mês.
        </Text>

        <Text style={styles.infoWarning}>
          ⚠️ Essa ação não deve ser feita antes que todos os ministérios
          tenham finalizado suas escalas.
        </Text>
      </View>

      {/* ACTION */}
      {!done ? (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            loading && { opacity: 0.6 },
          ]}
          disabled={loading}
          onPress={() => setConfirmOpen(true)}
        >
          <Text style={styles.primaryText}>
            {loading ? "Consolidando…" : "Publicar escala geral"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            ✅ Escala geral publicada com sucesso
          </Text>
          <Text style={styles.successSub}>
            Os membros já podem visualizar a escala do mês.
          </Text>
        </View>
      )}

      {/* ERROR */}
      {error && (
        <Text style={styles.errorText}>
          ❌ {error}
        </Text>
      )}

      {/* CONFIRM MODAL */}
      <Modal visible={confirmOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Confirmar publicação
            </Text>

            <Text style={styles.modalText}>
              Você está prestes a publicar a escala geral de{" "}
              <Text style={{ fontWeight: "900" }}>
                {monthLabel}
              </Text>
              .
            </Text>

            <Text style={styles.modalWarning}>
              Após publicada, os membros receberão notificação e a
              escala ficará visível no app.
            </Text>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                loading && { opacity: 0.6 },
              ]}
              disabled={loading}
              onPress={handleConfirmConsolidation}
            >
              <Text style={styles.confirmText}>
                {loading ? "Publicando…" : "Confirmar publicação"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setConfirmOpen(false)}
              disabled={loading}
            >
              <Text>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    flex: 1,
  },

  title: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  subtitle: {
    color: "#6B7280",
    marginBottom: 16,
  },

  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    color: "#111827",
  },

  infoText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },

  infoWarning: {
    fontSize: 13,
    color: "#92400E",
    marginTop: 6,
  },

  primaryButton: {
    backgroundColor: "#065F46",
    paddingVertical: 14,
    borderRadius: 12,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  successBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  successText: {
    fontWeight: "900",
    color: "#065F46",
  },

  successSub: {
    marginTop: 4,
    color: "#065F46",
    fontSize: 13,
  },

  errorText: {
    marginTop: 12,
    color: "#B91C1C",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  modal: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },

  modalText: {
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },

  modalWarning: {
    fontSize: 13,
    color: "#92400E",
    marginBottom: 14,
    textAlign: "center",
  },

  confirmButton: {
    backgroundColor: "#065F46",
    paddingVertical: 14,
    borderRadius: 12,
  },

  confirmText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },

  cancelButton: {
    marginTop: 10,
    alignItems: "center",
  },
});
