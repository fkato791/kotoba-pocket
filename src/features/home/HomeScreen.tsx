import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { ChevronDown, ChevronUp, Plus, Search } from "lucide-react-native";
import { listCards, listDailyReviewCounts, type DailyReviewCount } from "@/data/repositories/cardRepository";
import type { Card } from "@/domain/models";
import { buildTodayQueue } from "@/features/review/reviewQueue";
import { nowIso } from "@/lib/time";
import { AppButton } from "@/ui/components/AppButton";
import { CardPreview } from "@/ui/components/CardPreview";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, isClassicWindows, spacing } from "@/ui/theme";

type Filter = "all" | "new" | "due" | "difficult" | "idiom" | "saved";

export function HomeScreen(): JSX.Element {
  const [cards, setCards] = useState<Card[]>([]);
  const [activity, setActivity] = useState<DailyReviewCount[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const today = nowIso();
  const todayCards = buildTodayQueue(cards, today);
  const filteredCards = useMemo(() => filterCards(cards, filter, today), [cards, filter, today]);
  const recentCards = filteredCards.slice(0, 8);
  const newTodayCount = cards.filter(card => card.created_at.slice(0, 10) === today.slice(0, 10)).length;
  const streak = calculateCurrentStreak(activity);

  useFocusEffect(
    useCallback(() => {
      void listCards({
        archived: false,
        ...(query ? { q: query } : {})
      }).then(setCards);
      void listDailyReviewCounts(365).then(setActivity);
    }, [query])
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.pageTitle}>ホーム</Text>
              <Text style={styles.subtitle}>今日も少しずつ積み上げましょう</Text>
            </View>
            <SyncStatusBadge />
          </View>
          <Text style={styles.sectionLabel}>今日の学習</Text>
          <View style={styles.statsGrid}>
            <StatCard label="今日の復習" value={todayCards.length} suffix="件" />
            <StatCard label="新規追加" value={newTodayCount} suffix="件" />
            <StatCard label="連続学習" value={streak} suffix="日" />
            <StatCard label="保存済み" value={cards.length} suffix="件" />
          </View>
          <View style={styles.actions}>
            <AppButton label="復習を始める" onPress={() => router.push("/review")} />
            <AppButton
              label="単語を追加"
              variant="secondary"
              icon={<Plus size={18} color={colors.text} />}
              onPress={() => router.push("/quick-add")}
            />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="前回の続きから復習する" onPress={() => router.push("/review")}>
            <Text style={styles.continueLink}>前回の続きから復習する</Text>
          </Pressable>
        </View>

        <StudySummaryCard data={activity} />

        <View style={styles.searchBox}>
          <Search size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="単語・意味・メモを検索"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            accessibilityLabel="単語、意味、メモを検索"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {filterItems.map(item => (
            <Chip key={item.value} label={item.label} selected={filter === item.value} onPress={() => setFilter(item.value)} />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近の単語</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="すべての単語を見る" onPress={() => router.push("/collection")}>
            <Text style={styles.textLink}>すべて見る</Text>
          </Pressable>
        </View>
        <FlatList
          data={recentCards}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <CardPreview card={item} onPress={() => router.push(`/card/${item.id}`)} />}
          ListEmptyComponent={
            <EmptyState
              title="最初の単語を追加しましょう"
              description="授業・会話・記事で出会った英語を、すぐに保存して復習できます。"
              actionLabel="単語を追加"
              onAction={() => router.push("/quick-add")}
            />
          }
        />
      </ScrollView>
    </View>
  );
}

const filterItems: { label: string; value: Filter }[] = [
  { label: "すべて", value: "all" },
  { label: "新規", value: "new" },
  { label: "復習", value: "due" },
  { label: "苦手", value: "difficult" },
  { label: "イディオム", value: "idiom" },
  { label: "保存済み", value: "saved" }
];

function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }): JSX.Element {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}<Text style={styles.statSuffix}>{suffix}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StudySummaryCard({ data }: { data: DailyReviewCount[] }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const lastSeven = buildRecentDailyCounts(data, 7);
  const lastYear = buildYearHeatmapCounts(data);
  const weekDays = lastSeven.filter(item => item.count > 0).length;
  const totalDays = data.filter(item => item.count > 0).length;
  const totalReviews = data.reduce((sum, item) => sum + item.count, 0);
  const weekReviews = lastSeven.reduce((sum, item) => sum + item.count, 0);
  const bestDay = data.reduce((best, item) => item.count > best.count ? item : best, { date: "", count: 0 });
  const streak = calculateCurrentStreak(data);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>学習記録</Text>
          <Text style={styles.summaryCaption}>今週 {weekDays} / 7日 ・ {streak}日連続</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "学習記録を閉じる" : "学習記録を開く"}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)}
          style={styles.dropdownButton}
        >
          <Text style={styles.textLink}>{expanded ? "閉じる" : "詳しく見る"}</Text>
          {expanded ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={colors.primary} />}
        </Pressable>
      </View>
      <View style={styles.heatmapSection}>
        <View style={styles.heatmapHeader}>
          <Text style={styles.heatmapTitle}>直近7日</Text>
          <Text style={styles.heatmapCaption}>{weekReviews}件</Text>
        </View>
        <View style={styles.miniHeatmap}>
          {lastSeven.map(item => (
            <View
              key={item.date}
              style={[styles.miniCell, item.count > 0 && styles.miniCellDone]}
              accessibilityLabel={`${item.date}: ${item.count}件`}
            >
              <Text style={[styles.miniCellText, item.count > 0 && styles.miniCellTextDone]}>{item.count}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.summaryFoot}>過去365日: {totalDays}日学習</Text>
      {expanded ? (
        <View style={styles.summaryDetails}>
          <View style={styles.detailGrid}>
            <DetailMetric label="今週の復習" value={`${weekReviews}件`} />
            <DetailMetric label="累計復習" value={`${totalReviews}件`} />
            <DetailMetric label="最高記録" value={`${bestDay.count}件`} />
          </View>
          <YearHeatmap data={lastYear} />
        </View>
      ) : null}
    </View>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <View style={styles.detailMetric}>
      <Text style={styles.detailValue}>{value}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
  );
}

function YearHeatmap({ data }: { data: DailyReviewCount[] }): JSX.Element {
  const { width } = useWindowDimensions();
  const max = Math.max(1, ...data.map(item => item.count));
  const months = toMonthGroups(data);
  const totalColumns = Math.max(1, months.reduce((sum, month) => sum + month.weeks.length, 0));
  const monthGap = width < 430 ? 3 : 6;
  const cellGap = 1;
  const availableWidth = Math.max(220, Math.min(width, 760) - 88);
  const cellSize = clamp(
    Math.floor((availableWidth - monthGap * Math.max(0, months.length - 1) - cellGap * Math.max(0, totalColumns - months.length)) / totalColumns),
    3,
    8
  );
  const cellStyle = { width: cellSize, height: cellSize, borderRadius: cellSize <= 4 ? 1 : 2 };
  const cellPitch = cellSize + cellGap;
  const weekdayTextStyle = {
    height: cellSize,
    lineHeight: cellSize,
    fontSize: clamp(cellSize + 3, 6, 10)
  };
  const legendCellStyle = { width: Math.max(6, cellSize), height: Math.max(6, cellSize) };

  return (
    <View style={styles.yearHeatmapPanel}>
      <View style={styles.heatmapHeader}>
        <Text style={styles.heatmapTitle}>過去365日</Text>
        <View style={styles.legendScale}>
          <Text style={styles.legendText}>少</Text>
          {levelStyles.map((style, index) => (
            <View key={index} style={[styles.yearCell, legendCellStyle, style]} />
          ))}
          <Text style={styles.legendText}>多</Text>
        </View>
      </View>
      <View style={styles.calendarWrap}>
        <View style={[styles.weekdayColumn, { gap: cellGap }]}>
          {weekdayLabels.map(label => (
            <Text key={label} style={[styles.weekdayLabel, weekdayTextStyle]}>{label}</Text>
          ))}
        </View>
        <View style={[styles.months, { gap: monthGap }]}>
          {months.map(month => (
            <View key={month.key} style={styles.monthGroup}>
              <View style={[styles.monthGrid, { gap: cellGap }]}>
                {month.weeks.map((week, weekIndex) => {
                  const firstDayIndex = week.findIndex(Boolean);
                  const visibleDays = week.filter(isDailyReviewCount);
                  return (
                    <View
                      key={`${month.key}-${weekIndex}`}
                      style={[styles.week, { gap: cellGap }, weekIndex === 0 && firstDayIndex > 0 ? { marginTop: firstDayIndex * cellPitch } : null]}
                    >
                      {visibleDays.map(item => {
                        const level = getLevel(item?.count ?? 0, max);
                        return (
                          <View
                            key={item.date}
                            style={[styles.yearCell, cellStyle, levelStyles[level]]}
                            accessibilityLabel={`${item.date}: ${item.count}件`}
                          />
                        );
                      })}
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.monthLabel, { fontSize: clamp(cellSize + 3, 7, 12) }]}>{month.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

interface MonthGroup {
  key: string;
  label: string;
  weeks: (DailyReviewCount | null)[][];
}

const monthLabels = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const weekdayLabels = ["月", "火", "水", "木", "金", "土", "日"];

function toMonthGroups(data: DailyReviewCount[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  for (const item of data) {
    const date = parseDateKey(item.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = formatMonthLabel(date);
    const group = groups.get(key) ?? { key, label, weeks: [] };
    const weekIndex = Math.floor((date.getDate() + firstWeekdayOfMonthMonday(date) - 1) / 7);
    const dayIndex = getMondayBasedDayIndex(date);
    const emptyWeek: (DailyReviewCount | null)[] = [null, null, null, null, null, null, null];
    const week = group.weeks[weekIndex] ?? [...emptyWeek];
    week[dayIndex] = item;
    group.weeks[weekIndex] = week;
    groups.set(key, group);
  }
  return [...groups.values()];
}

function formatMonthLabel(date: Date): string {
  return monthLabels[date.getMonth()] ?? "";
}

function firstWeekdayOfMonthMonday(date: Date): number {
  return getMondayBasedDayIndex(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getMondayBasedDayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function getLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isDailyReviewCount(item: DailyReviewCount | null): item is DailyReviewCount {
  return item !== null;
}

function buildRecentDailyCounts(data: DailyReviewCount[], days: number): DailyReviewCount[] {
  const counts = new Map(data.map(item => [item.date, item.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = formatDateKey(date);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

function buildYearHeatmapCounts(data: DailyReviewCount[]): DailyReviewCount[] {
  const counts = new Map(data.map(item => [item.date, item.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = formatDateKey(date);
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

function parseDateKey(dateKey: string): Date {
  const [year = 1970, month = 1, day = 1] = dateKey.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterCards(cards: Card[], filter: Filter, now: string): Card[] {
  if (filter === "new") return cards.filter(card => !card.due_at);
  if (filter === "due") return cards.filter(card => !card.due_at || card.due_at <= now);
  if (filter === "difficult") return cards.filter(card => card.is_pinned || card.difficulty >= 3 || card.lapses > 0);
  if (filter === "idiom") return cards.filter(card => card.term_type === "idiom");
  return cards;
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
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 112
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, alignItems: "flex-start" },
  heroCopy: { flex: 1, gap: spacing.xs },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  sectionLabel: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: {
    flexGrow: 1,
    flexBasis: "46%",
    minHeight: 86,
    borderRadius: 8,
    backgroundColor: isClassicWindows ? colors.surface : colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    justifyContent: "center"
  },
  statValue: { color: colors.text, fontSize: 26, fontWeight: "900" },
  statSuffix: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  statLabel: { color: colors.muted, fontSize: 13, fontWeight: "800", marginTop: spacing.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  continueLink: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md
  },
  summaryCaption: { color: colors.muted, fontSize: 13, fontWeight: "700", marginTop: spacing.xs },
  dropdownButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  heatmapSection: { gap: spacing.xs },
  heatmapHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  heatmapTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  heatmapCaption: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  miniHeatmap: { flexDirection: "row", gap: spacing.xs },
  miniCell: {
    flex: 1,
    height: 26,
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  miniCellDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  miniCellText: { color: colors.muted, fontSize: 12, fontWeight: "900" },
  miniCellTextDone: { color: colors.primaryText },
  summaryFoot: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  summaryDetails: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  detailMetric: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: isClassicWindows ? colors.surface : colors.background,
    padding: spacing.sm,
    justifyContent: "center"
  },
  detailValue: { color: colors.text, fontSize: 18, fontWeight: "900" },
  detailLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: spacing.xs },
  yearHeatmapPanel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: isClassicWindows ? colors.surface : colors.background,
    padding: spacing.xs,
    gap: spacing.sm
  },
  calendarWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    width: "100%"
  },
  weekdayColumn: {},
  weekdayLabel: {
    width: 12,
    color: colors.muted,
    fontWeight: "800",
    textAlign: "center"
  },
  months: {
    flexDirection: "row",
    flexShrink: 1,
    alignItems: "flex-start"
  },
  monthGroup: { gap: spacing.xs, alignItems: "center" },
  monthLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  monthGrid: {
    flexDirection: "row",
    paddingHorizontal: 0
  },
  week: {},
  yearCell: {
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)"
  },
  level0: { backgroundColor: colors.primarySoft },
  level1: { backgroundColor: "#BFDBFE" },
  level2: { backgroundColor: "#60A5FA" },
  level3: { backgroundColor: "#2563EB" },
  level4: { backgroundColor: "#1E40AF" },
  legendScale: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  searchBox: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, minHeight: 46 },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  textLink: { color: colors.primary, fontSize: 13, fontWeight: "900" }
});

const levelStyles = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4] as const;
