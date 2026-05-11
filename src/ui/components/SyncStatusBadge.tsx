import { StyleSheet, Text, View } from "react-native";
import { useSyncStore } from "@/features/sync/syncStore";
import { colors, spacing } from "@/ui/theme";

const labels = {
  offline: "オフライン保存中",
  syncing: "同期中",
  synced: "同期済み",
  error: "同期エラー"
};

export function SyncStatusBadge(): JSX.Element {
  const status = useSyncStore(state => state.status);
  return (
    <View style={[styles.badge, status === "error" && styles.error]}>
      <Text style={styles.text}>{labels[status]}</Text>
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
  text: { color: colors.text, fontSize: 12, fontWeight: "700" }
});
