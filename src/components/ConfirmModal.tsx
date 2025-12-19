import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{title}</Text>

          {!!message && (
            <Text style={styles.message}>{message}</Text>
          )}

          <Pressable
            style={styles.primary}
            onPress={onConfirm}
          >
            <Text style={styles.primaryText}>{confirmText}</Text>
          </Pressable>

          <Pressable
            style={styles.cancel}
            onPress={onCancel}
          >
            <Text>{cancelText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    textAlign: "center",
    color: "#374151",
    marginBottom: 14,
  },
  primary: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    textAlign: "center",
  },
  cancel: {
    marginTop: 12,
    alignItems: "center",
  },
});
