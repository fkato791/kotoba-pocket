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
  return (
    <View style={[styles.badge, status === "error" && styles.error]}>
      <Text style={styles.text}>{labels[status]}</Text>
      {error ? <Text style={styles.errorText} numberOfLines={2}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.chip
  },
  error: { backgroundColor: "#FEE2E2" },
  text: { color: colors.text, fontSize: 12, fontWeight: "700" },
  errorText: { color: colors.danger, fontSize: 11, marginTop: spacing.xs, maxWidth: 260 }
});
