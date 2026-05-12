import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/ui/components/AppButton";
import { colors, spacing } from "@/ui/theme";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}><Text style={styles.iconText}>A</Text></View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: { color: colors.primary, fontSize: 24, fontWeight: "900" },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  description: { color: colors.muted, textAlign: "center", lineHeight: 20 }
});
