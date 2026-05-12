import { StyleSheet, Text, View } from "react-native";
import type { DailyReviewCount } from "@/data/repositories/cardRepository";
import { colors, spacing } from "@/ui/theme";

interface ReviewActivityChartProps {
  data: DailyReviewCount[];
}

export function ReviewActivityChart({ data }: ReviewActivityChartProps): JSX.Element {
  const max = Math.max(1, ...data.map(item => item.count));

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>学習記録</Text>
        <Text style={styles.caption}>直近7日</Text>
      </View>
      <View style={styles.chart}>
        {data.map(item => {
          const height = Math.max(8, Math.round((item.count / max) * 72));
          return (
            <View key={item.date} style={styles.barWrap}>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height }]} />
              </View>
              <Text style={styles.count}>{item.count}</Text>
              <Text style={styles.day}>{formatDay(item.date)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function formatDay(date: string): string {
  const day = new Date(`${date}T00:00:00`).getDay();
  return ["日", "月", "火", "水", "木", "金", "土"][day] ?? "";
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },
  caption: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  chart: {
    minHeight: 116,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs
  },
  barTrack: {
    height: 76,
    width: "100%",
    maxWidth: 28,
    borderRadius: 6,
    backgroundColor: colors.background,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  bar: {
    width: "100%",
    borderRadius: 6,
    backgroundColor: colors.primary
  },
  count: { color: colors.text, fontSize: 12, fontWeight: "800" },
  day: { color: colors.muted, fontSize: 12, fontWeight: "700" }
});
