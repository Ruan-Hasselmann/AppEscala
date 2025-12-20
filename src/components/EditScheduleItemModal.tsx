import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PersonOption = {
  id: string;
  name: string;
};

type Props = {
  visible: boolean;
  ministryName: string;
  role: string;
  currentPersonId: string;
  people: PersonOption[];
  onSelect: (personId: string) => void;
  onCancel: () => void;
};

export default function EditScheduleItemModal({
  visible,
  ministryName,
  role,
  currentPersonId,
  people,
  onSelect,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Editar escala</Text>

          <Text style={styles.subtitle}>
            {ministryName} — {role}
          </Text>

          <ScrollView style={{ marginTop: 12 }}>
            {people.map((p) => {
              const selected = p.id === currentPersonId;

              return (
                <Pressable
                  key={p.id}
                  onPress={() => onSelect(p.id)}
                  style={[
                    styles.option,
                    selected && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
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
    padding: 16,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#374151",
    marginTop: 4,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  optionSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  optionText: {
    fontWeight: "700",
    color: "#111827",
  },
  optionTextSelected: {
    color: "#FFFFFF",
  },
  cancel: {
    marginTop: 12,
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "700",
    color: "#2563EB",
  },
});
