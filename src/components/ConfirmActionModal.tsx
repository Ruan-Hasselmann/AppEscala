import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export function ConfirmActionModal({
    visible,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    destructive = false,
    onConfirm,
    onCancel,
}: Props) {
    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.modal}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <View style={styles.actions}>
                        <Pressable onPress={onCancel} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </Pressable>

                        <Pressable
                            onPress={onConfirm}
                            style={[
                                styles.confirmBtn,
                                destructive && styles.destructive,
                            ]}
                        >
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modal: {
        width: "100%",
        maxWidth: 420,
        backgroundColor: "#FFF",
        borderRadius: 16,
        padding: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
        marginBottom: 8,
        color: "#111827",
    },
    message: {
        fontSize: 15,
        color: "#374151",
        marginBottom: 20,
    },
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    cancelText: {
        fontWeight: "700",
        color: "#374151",
    },
    confirmBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        backgroundColor: "#2563EB",
        borderRadius: 10,
    },
    destructive: {
        backgroundColor: "#DC2626",
    },
    confirmText: {
        color: "#FFF",
        fontWeight: "900",
    },
});
