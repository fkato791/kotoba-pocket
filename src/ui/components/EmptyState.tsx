import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/ui/components/AppButton";
import { colors, isClassicWindows, spacing } from "@/ui/theme";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconLabel?: string;
}

export function EmptyState({ title, description, actionLabel, onAction, iconLabel = "A" }: EmptyStateProps): JSX.Element {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.icon} accessible={false}><Text style={styles.iconText}>{iconLabel}</Text></View>
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
    borderRadius: isClassicWindows ? 0 : 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: isClassicWindows ? 0 : 26,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: { color: colors.primary, fontSize: 24, fontWeight: "900" },
  title: { color: colors.text, fontSize: 18, fontWeight: "900", textAlign: "center" },
  description: { color: colors.muted, textAlign: "center", lineHeight: 20 }
});
