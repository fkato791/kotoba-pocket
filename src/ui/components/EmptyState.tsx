import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/ui/theme";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: spacing.xl, alignItems: "center", gap: spacing.sm },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  description: { color: colors.muted, textAlign: "center", lineHeight: 20 }
});
