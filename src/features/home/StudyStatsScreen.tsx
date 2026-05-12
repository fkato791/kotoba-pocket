import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { listDailyReviewCounts, type DailyReviewCount } from "@/data/repositories/cardRepository";
import { HabitTracker } from "@/features/home/HabitTracker";
import { ReviewActivityChart } from "@/features/home/ReviewActivityChart";
import { colors, spacing } from "@/ui/theme";

export function StudyStatsScreen(): JSX.Element {
  const [activity, setActivity] = useState<DailyReviewCount[]>([]);
  const lastSeven = activity.slice(-7);
  const stats = useMemo(() => {
    const total = activity.reduce((sum, item) => sum + item.count, 0);
    const days = activity.filter(item => item.count > 0).length;
    const best = activity.reduce((max, item) => Math.max(max, item.count), 0);
    return { total, days, best };
  }, [activity]);

  useFocusEffect(
    useCallback(() => {
      void listDailyReviewCounts(365).then(setActivity);
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>学習記録</Text>
        <Text style={styles.subtitle}>過去365日の復習ペースを確認できます。</Text>
      </View>
      <View style={styles.statsRow}>
        <Metric label="復習数" value={`${stats.total}件`} />
        <Metric label="学習日" value={`${stats.days}日`} />
        <Metric label="最高" value={`${stats.best}件`} />
      </View>
      <ReviewActivityChart data={lastSeven} />
      <HabitTracker data={activity} />
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 112,
    backgroundColor: colors.background
  },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, padding: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  metricValue: { color: colors.text, fontSize: 20, fontWeight: "900" },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: spacing.xs }
});
