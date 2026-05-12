import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { listCards, listDailyReviewCounts, type DailyReviewCount } from "@/data/repositories/cardRepository";
import type { Card } from "@/domain/models";
import { buildTodayQueue } from "@/features/review/reviewQueue";
import { nowIso } from "@/lib/time";
import { AppButton } from "@/ui/components/AppButton";
import { CardPreview } from "@/ui/components/CardPreview";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, spacing } from "@/ui/theme";

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
          <Pressable accessibilityRole="button" onPress={() => router.push("/review")}>
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
          <Pressable accessibilityRole="button" onPress={() => router.push("/collection")}>
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
  const lastSeven = data.slice(-7);
  const weekDays = lastSeven.filter(item => item.count > 0).length;
  const totalDays = data.filter(item => item.count > 0).length;
  const streak = calculateCurrentStreak(data);
  return (
    <View style={styles.summaryCard}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>学習記録</Text>
          <Text style={styles.summaryCaption}>今週 {weekDays} / 7日 ・ {streak}日連続</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/study-stats")}>
          <Text style={styles.textLink}>詳しく見る</Text>
        </Pressable>
      </View>
      <View style={styles.miniHeatmap}>
        {lastSeven.map(item => (
          <View key={item.date} style={[styles.miniCell, item.count > 0 && styles.miniCellDone]} />
        ))}
      </View>
      <Text style={styles.summaryFoot}>過去365日: {totalDays}日学習</Text>
    </View>
  );
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
    backgroundColor: colors.background,
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
  miniHeatmap: { flexDirection: "row", gap: spacing.xs },
  miniCell: { flex: 1, height: 18, borderRadius: 5, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: colors.border },
  miniCellDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  summaryFoot: { color: colors.muted, fontSize: 12, fontWeight: "700" },
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
