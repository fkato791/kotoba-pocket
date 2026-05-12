import { StyleSheet, Text, View } from "react-native";
import { useSyncStore } from "@/features/sync/syncStore";
import { colors, spacing } from "@/ui/theme";

const labels = {
  offline: "オフライン保存中",
  syncing: "同期中",
  synced: "同期済み",
  signed_out: "ログイン待ち",
  error: "同期エラー"
};

export function SyncStatusBadge(): JSX.Element {
  const status = useSyncStore(state => state.status);
  const error = useSyncStore(state => state.error);
  const pendingCount = useSyncStore(state => state.pendingCount);
  return (
    <View style={[styles.badge, status === "error" && styles.error, status === "signed_out" && styles.waiting]}>
      <Text style={styles.text}>{labels[status]}</Text>
      {pendingCount > 0 ? <Text style={styles.detail}>{pendingCount}件待機中</Text> : null}
      {error ? <Text style={styles.errorText} numberOfLines={2}>{toFriendlyError(error)}</Text> : null}
    </View>
  );
}

function toFriendlyError(error: string): string {
  if (error.includes("Unauthorized") || error.includes("401")) return "ログイン状態を確認してください";
  if (error.toLowerCase().includes("failed to fetch")) return "ネットワーク接続を確認してください";
  return error;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chip
  },
  waiting: { backgroundColor: "#FEF3C7" },
  error: { backgroundColor: "#FEE2E2" },
  text: { color: colors.text, fontSize: 12, fontWeight: "700" },
  detail: { color: colors.muted, fontSize: 11, marginTop: 2 },
  errorText: { color: colors.danger, fontSize: 11, marginTop: spacing.xs, maxWidth: 260 }
});
