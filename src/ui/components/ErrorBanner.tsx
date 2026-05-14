import { StyleSheet, Text, View } from "react-native";
import { colors, isClassicWindows, spacing } from "@/ui/theme";

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
  if (lower.includes("sign-in required") || lower.includes("sign in required")) return "ログインすると同期できます。ローカル保存はそのまま利用できます。";
  if (lower.includes("supabase url is not configured")) return "SupabaseのURLが未設定です。.env の EXPO_PUBLIC_SUPABASE_URL を確認してください。";
  if (lower.includes("jwt") || lower.includes("session expired")) return "ログイン期限が切れています。もう一度ログインしてください。";
  if (lower.includes("relation") && lower.includes("does not exist")) return "Supabaseのテーブルが見つかりません。SQL migrations が実行済みか確認してください。";
  if (lower.includes("row-level security") || lower.includes("violates row-level security")) return "SupabaseのRLS設定で保存できません。ログイン状態とRLSポリシーを確認してください。";
  if (lower.includes("rate limit")) return "短時間に操作が集中しています。少し待ってからもう一度試してください。";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "ネットワーク接続を確認してください。オフライン中でもローカル保存は利用できます。";
  return message;
}

const styles = StyleSheet.create({
  wrap: {
    padding: spacing.md,
    gap: spacing.xs,
    borderRadius: isClassicWindows ? 0 : 8,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft
  },
  title: { color: colors.danger, fontSize: 14, fontWeight: "900" },
  message: { color: colors.text, lineHeight: 20 }
});
