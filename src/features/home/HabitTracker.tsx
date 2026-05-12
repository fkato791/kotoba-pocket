import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { DailyReviewCount } from "@/data/repositories/cardRepository";
import { colors, spacing } from "@/ui/theme";

interface HabitTrackerProps {
  data: DailyReviewCount[];
}

export function HabitTracker({ data }: HabitTrackerProps): JSX.Element {
  const completedDays = data.filter(item => item.count > 0).length;
  const totalReviews = data.reduce((sum, item) => sum + item.count, 0);
  const streak = calculateCurrentStreak(data);
  const max = Math.max(1, ...data.map(item => item.count));
  const months = toMonthGroups(data);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>ハビットトラッカー</Text>
          <Text style={styles.caption}>過去365日を1日ごとに表示</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>日連続</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Metric label="学習日" value={`${completedDays}日`} />
        <Metric label="復習数" value={`${totalReviews}件`} />
        <Metric label="平均" value={`${completedDays > 0 ? Math.round(totalReviews / completedDays) : 0}件/日`} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarWrap}>
          <View style={styles.weekdayColumn}>
            {weekdayLabels.map(label => (
              <Text key={label} style={styles.weekdayLabel}>{label}</Text>
            ))}
          </View>
          <View style={styles.months}>
            {months.map(month => (
              <View key={month.key} style={styles.monthGroup}>
                <Text style={styles.monthLabel}>{month.label}</Text>
                <View style={styles.monthGrid}>
                  {month.weeks.map((week, weekIndex) => (
                    <View key={`${month.key}-${weekIndex}`} style={styles.week}>
                      {week.map((item, dayIndex) => {
                        const level = getLevel(item?.count ?? 0, max);
                        return (
                          <View
                            key={item?.date ?? `${month.key}-empty-${weekIndex}-${dayIndex}`}
                            style={[styles.cell, levelStyles[level]]}
                            accessibilityLabel={item ? `${item.date}: ${item.count}件` : "空白"}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.summary}>過去365日 {completedDays}日 学習</Text>
        <View style={styles.legendScale}>
          <Text style={styles.legendText}>少</Text>
          {levelStyles.map((style, index) => (
            <View key={index} style={[styles.cell, style]} />
          ))}
          <Text style={styles.legendText}>多</Text>
        </View>
      </View>
    </View>
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

interface MonthGroup {
  key: string;
  label: string;
  weeks: (DailyReviewCount | null)[][];
}

const monthLabels = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function toMonthGroups(data: DailyReviewCount[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const item of data) {
    const date = new Date(`${item.date}T00:00:00`);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = monthLabels[date.getMonth()] ?? "";
    const group = groups.get(key) ?? { key, label, weeks: [] };
    const weekIndex = Math.floor((date.getDate() + firstWeekdayOfMonth(date) - 1) / 7);
    const dayIndex = date.getDay();
    const emptyWeek: (DailyReviewCount | null)[] = [null, null, null, null, null, null, null];
    const week = group.weeks[weekIndex] ?? [...emptyWeek];
    week[dayIndex] = item;
    group.weeks[weekIndex] = week;
    groups.set(key, group);
  }
  return [...groups.values()];
}

function firstWeekdayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function getLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function calculateCurrentStreak(data: DailyReviewCount[]): number {
  let streak = 0;
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const item = data[index];
    if (item && item.count > 0) streak += 1;
    else break;
  }
  return streak;
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
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerText: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: "900" },
  caption: { color: colors.muted, fontSize: 12, fontWeight: "700", marginTop: spacing.xs },
  streakBadge: {
    minWidth: 72,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.chip,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm
  },
  streakNumber: { color: colors.primary, fontSize: 22, fontWeight: "900" },
  streakLabel: { color: colors.text, fontSize: 11, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  metric: { flex: 1, padding: spacing.sm, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: "900" },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: 2 },
  scrollContent: {
    paddingBottom: spacing.xs
  },
  calendarWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  weekdayColumn: {
    gap: 2,
    paddingTop: 22
  },
  weekdayLabel: {
    width: 12,
    height: 10,
    color: colors.text,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 10,
    textAlign: "center"
  },
  months: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start"
  },
  monthGroup: {
    gap: spacing.xs
  },
  monthLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  monthGrid: {
    flexDirection: "row",
    gap: 2,
    paddingRight: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.border
  },
  week: { gap: 2 },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)"
  },
  level0: { backgroundColor: "#EFF6FF" },
  level1: { backgroundColor: "#BFDBFE" },
  level2: { backgroundColor: "#60A5FA" },
  level3: { backgroundColor: "#2563EB" },
  level4: { backgroundColor: "#1E40AF" },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  summary: { color: colors.text, fontSize: 13, fontWeight: "800", flex: 1 },
  legendScale: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendText: { color: colors.muted, fontSize: 11, fontWeight: "700" }
});

const levelStyles = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4] as const;
