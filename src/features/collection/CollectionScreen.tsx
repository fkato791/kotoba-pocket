import { useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Search } from "lucide-react-native";
import { listCards } from "@/data/repositories/cardRepository";
import type { Card } from "@/domain/models";
import { CardPreview } from "@/ui/components/CardPreview";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { colors, spacing } from "@/ui/theme";

type Filter = "all" | "new" | "due" | "difficult" | "idiom" | "archived";

export function CollectionScreen(): JSX.Element {
  const [cards, setCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const filteredCards = useMemo(() => applyClientFilters(cards, filter), [cards, filter]);

  useFocusEffect(
    useCallback(() => {
      void listCards({
        archived: filter === "archived" ? true : false,
        ...(query ? { q: query } : {})
      }).then(setCards);
    }, [filter, query])
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>単語</Text>
        <Text style={styles.subtitle}>保存した英語を検索・整理できます。</Text>
      </View>

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {filterItems.map(item => (
          <Chip key={item.value} label={item.label} selected={filter === item.value} onPress={() => setFilter(item.value)} />
        ))}
      </ScrollView>

      <Text style={styles.countText}>{filteredCards.length}件</Text>

      <FlatList
        data={filteredCards}
        contentContainerStyle={styles.list}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => <CardPreview card={item} onPress={() => router.push(`/card/${item.id}`)} />}
        ListEmptyComponent={
          <EmptyState
            title="条件に合う単語がありません"
            description="検索語やフィルターを変えるか、新しい単語を追加してみましょう。"
            actionLabel="単語を追加"
            onAction={() => router.push("/quick-add")}
          />
        }
      />
    </View>
  );
}

const filterItems: { label: string; value: Filter }[] = [
  { label: "すべて", value: "all" },
  { label: "新規", value: "new" },
  { label: "復習", value: "due" },
  { label: "苦手", value: "difficult" },
  { label: "イディオム", value: "idiom" },
  { label: "アーカイブ", value: "archived" }
];

function applyClientFilters(cards: Card[], filter: Filter): Card[] {
  const now = new Date().toISOString();
  if (filter === "new") return cards.filter(card => !card.due_at);
  if (filter === "due") return cards.filter(card => !card.due_at || card.due_at <= now);
  if (filter === "difficult") return cards.filter(card => card.is_pinned || card.difficulty >= 3 || card.lapses > 0);
  if (filter === "idiom") return cards.filter(card => card.term_type === "idiom");
  return cards;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14 },
  searchBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  countText: { color: colors.muted, fontWeight: "800", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  list: { padding: spacing.lg, paddingBottom: 112 }
});
