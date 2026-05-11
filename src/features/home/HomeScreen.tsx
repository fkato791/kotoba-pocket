import { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, router, useFocusEffect } from "expo-router";
import { Plus } from "lucide-react-native";
import { listCards } from "@/data/repositories/cardRepository";
import type { Card } from "@/domain/models";
import { buildTodayQueue } from "@/features/review/reviewQueue";
import { nowIso } from "@/lib/time";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { CardPreview } from "@/ui/components/CardPreview";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { SyncStatusBadge } from "@/ui/components/SyncStatusBadge";
import { colors, spacing } from "@/ui/theme";

export function HomeScreen(): JSX.Element {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const todayCards = buildTodayQueue(cards, nowIso());

  useFocusEffect(
    useCallback(() => {
      void listCards({
        archived: false,
        ...(query ? { q: query } : {})
      }).then(setCards);
    }, [query])
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SyncStatusBadge />
        <View style={styles.quickAdd}>
          <AppButton
            label="すばやく追加"
            icon={<Plus size={18} color={colors.primaryText} />}
            onPress={() => router.push("/quick-add")}
            accessibilityLabel="単語またはイディオムをすばやく追加"
          />
        </View>
        <View style={styles.today}>
          <Text style={styles.todayCount}>{todayCards.length}</Text>
          <Text style={styles.todayLabel}>今日の復習</Text>
          <AppButton label="前回の続き" variant="secondary" onPress={() => router.push("/review")} />
        </View>
        <AppInput
          label="検索"
          value={query}
          onChangeText={setQuery}
          placeholder="単語・意味・メモ"
          accessibilityLabel="カードを検索"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="New" onPress={() => router.push("/collection")} />
          <Chip label="Due" onPress={() => router.push("/review")} />
          <Chip label="Difficult" />
          <Chip label="Idioms" />
          <Chip label="Offline saved" />
        </ScrollView>
        <View style={styles.navRow}>
          <Link href="/collection" style={styles.navLink}>コレクション</Link>
          <Link href="/import-export" style={styles.navLink}>データ</Link>
          <Link href="/settings" style={styles.navLink}>設定</Link>
        </View>
        <Text style={styles.sectionTitle}>最近追加</Text>
        <FlatList
          data={cards.slice(0, 8)}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <CardPreview card={item} onPress={() => router.push(`/card/${item.id}`)} />}
          ListEmptyComponent={<EmptyState title="まだカードがありません" description="見つけた英語を5秒で保存できます。" />}
        />
      </ScrollView>
      <View style={styles.fab}>
        <AppButton label="+" onPress={() => router.push("/quick-add")} accessibilityLabel="追加" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 96 },
  quickAdd: { gap: spacing.sm },
  today: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  todayCount: { fontSize: 44, fontWeight: "900", color: colors.text },
  todayLabel: { color: colors.muted, fontWeight: "700" },
  chips: { gap: spacing.sm },
  navRow: { flexDirection: "row", gap: spacing.lg },
  navLink: { color: colors.primary, fontWeight: "800" },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: colors.text },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.lg, width: 56 }
});
