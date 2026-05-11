import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors, spacing } from "@/ui/theme";

interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function AppInput({ label, error, style, ...props }: AppInputProps): JSX.Element {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  error: { color: colors.danger, fontSize: 13 }
});
