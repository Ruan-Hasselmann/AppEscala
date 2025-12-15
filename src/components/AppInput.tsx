import { StyleSheet, TextInput, TextInputProps } from "react-native";

export default function AppInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#6B7280"
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
});
