import { StyleSheet, Text, View } from "react-native";

type LegendItem = {
  color: string;
  label: string;
};

export default function CalendarLegend({ items }: { items: LegendItem[] }) {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View
            style={[styles.dot, { backgroundColor: item.color }]}
          />
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    marginTop: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12, // 👈 ESPAÇO ENTRE OS ITENS
    marginVertical: 4,    // 👈 RESPIRO EM TELAS MENORES
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 6,
  },
  label: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
});

