import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/ui/theme";

interface ErrorBannerProps {
  title?: string;
  message: string;
}

export function ErrorBanner({ title = "エラーが発生しました", message }: ErrorBannerProps): JSX.Element {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{toFriendlyError(message)}</Text>
    </View>
  );
}

export function toFriendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (message.includes("401") || lower.includes("unauthorized")) return "ログイン状態を確認してください。ローカル保存はそのまま利用できます。";
  if (lower.includes("rate limit")) return "短時間に操作が集中しています。少し待ってからもう一度試してください。";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "ネットワーク接続を確認してください。オフライン中でもローカル保存は利用できます。";
  return message;
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft
  },
  title: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  message: { color: colors.text, lineHeight: 20 }
});
