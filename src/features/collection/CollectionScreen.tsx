import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { listCards } from "@/data/repositories/cardRepository";
import type { Card } from "@/domain/models";
import { CardPreview } from "@/ui/components/CardPreview";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { colors, spacing } from "@/ui/theme";

type Tab = "decks" | "tags" | "all";

export function CollectionScreen(): JSX.Element {
  const [tab, setTab] = useState<Tab>("all");
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<"all" | "due" | "difficult" | "idiom">("all");

  useEffect(() => {
    void listCards({
      archived: false,
      ...(filter === "difficult" ? { difficult: true } : {}),
      ...(filter === "idiom" ? { term_type: "idiom" as const } : {}),
      ...(filter === "due" ? { due_before: new Date().toISOString() } : {})
    }).then(setCards);
  }, [filter]);

  return (
    <View style={styles.screen}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <Chip label="Decks" selected={tab === "decks"} onPress={() => setTab("decks")} />
        <Chip label="Tags" selected={tab === "tags"} onPress={() => setTab("tags")} />
        <Chip label="All cards" selected={tab === "all"} onPress={() => setTab("all")} />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <Chip label="updated" selected />
        <Chip label="due" selected={filter === "due"} onPress={() => setFilter("due")} />
        <Chip label="hardest" selected={filter === "difficult"} onPress={() => setFilter("difficult")} />
        <Chip label="idiom-only" selected={filter === "idiom"} onPress={() => setFilter("idiom")} />
      </ScrollView>
      <FlatList
        data={cards}
        contentContainerStyle={styles.list}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => <CardPreview card={item} onPress={() => router.push(`/card/${item.id}`)} />}
        ListEmptyComponent={<EmptyState title="カードがありません" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  list: { padding: spacing.lg }
});
