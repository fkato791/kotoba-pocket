import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Edit3, Folder, FolderPlus, Search, Trash2 } from "lucide-react-native";
import { deleteCards, listCards } from "@/data/repositories/cardRepository";
import { createDeck, deleteDeck, listDecks, updateDeck } from "@/data/repositories/deckRepository";
import type { Card, Deck } from "@/domain/models";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { CardPreview } from "@/ui/components/CardPreview";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { colors, spacing } from "@/ui/theme";

type Filter = "all" | "new" | "due" | "difficult" | "idiom" | "archived";
type ViewMode = "decks" | "cards";

export function CollectionScreen(): JSX.Element {
  const [cards, setCards] = useState<Card[]>([]);
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("decks");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [deckName, setDeckName] = useState("");
  const [deckFolder, setDeckFolder] = useState("");
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [isSelectingCards, setIsSelectingCards] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(() => new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const selectedDeck = decks.find(deck => deck.id === selectedDeckId) ?? null;
  const filteredCards = useMemo(() => applyClientFilters(cards, filter), [cards, filter]);
  const selectedCount = selectedCardIds.size;
  const selectionMode = isSelectingCards;
  const deckCounts = useMemo(() => countCardsByDeck(allCards), [allCards]);
  const deckGroups = useMemo(() => groupDecksByFolder(decks), [decks]);

  const refresh = useCallback(() => {
    void listDecks().then(setDecks);
    void listCards({ archived: false }).then(setAllCards);
    void listCards({
      archived: filter === "archived" ? true : false,
      ...(selectedDeckId ? { deck_id: selectedDeckId } : {}),
      ...(query ? { q: query } : {})
    }).then(setCards);
  }, [filter, query, selectedDeckId]);

  useFocusEffect(refresh);

  async function saveDeck(): Promise<void> {
    const normalizedName = deckName.trim();
    if (!normalizedName) {
      Alert.alert("デッキ名を入力してください");
      return;
    }
    const duplicate = decks.some(deck => deck.id !== editingDeckId && deck.name.toLowerCase() === normalizedName.toLowerCase());
    if (duplicate) {
      Alert.alert("同じ名前のデッキがあります", "別の名前を入力してください。");
      return;
    }
    if (editingDeckId) {
      await updateDeck(editingDeckId, { name: normalizedName, folder: deckFolder.trim() || null });
    } else {
      await createDeck({ name: normalizedName, folder: deckFolder.trim() || null, color: colors.primary });
    }
    clearDeckForm();
    refresh();
  }

  function startEditDeck(deck: Deck): void {
    setEditingDeckId(deck.id);
    setDeckName(deck.name);
    setDeckFolder(deck.folder ?? "");
  }

  function clearDeckForm(): void {
    setEditingDeckId(null);
    setDeckName("");
    setDeckFolder("");
  }

  function confirmDeleteDeck(deck: Deck): void {
    const count = deckCounts.get(deck.id) ?? 0;
    if (count > 0) {
      Alert.alert("単語カードが入っています", "先に単語カードを別デッキへ移すか、単語帳を整理してから削除してください。");
      return;
    }
    Alert.alert("デッキを削除しますか？", `${deck.name} を一覧から削除します。`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => void deleteDeck(deck.id).then(() => {
          if (selectedDeckId === deck.id) setSelectedDeckId(null);
          refresh();
        })
      }
    ]);
  }

  function openDeck(deck: Deck): void {
    setSelectedDeckId(deck.id);
    setViewMode("cards");
    setFilter("all");
    clearCardSelection();
  }

  function toggleCardSelection(cardId: string): void {
    setConfirmingBulkDelete(false);
    setSelectedCardIds(current => {
      const next = new Set(current);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function clearCardSelection(): void {
    setIsSelectingCards(false);
    setSelectedCardIds(new Set());
    setConfirmingBulkDelete(false);
  }

  function selectAllVisibleCards(): void {
    setIsSelectingCards(true);
    setConfirmingBulkDelete(false);
    setSelectedCardIds(new Set(filteredCards.map(card => card.id)));
  }

  async function executeBulkDelete(): Promise<void> {
    const ids = [...selectedCardIds];
    if (ids.length === 0) return;
    const deleted = await deleteCards(ids);
    clearCardSelection();
    refresh();
    Alert.alert("削除しました", `${deleted}件の単語カードを削除しました。`);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>単語帳</Text>
        <Text style={styles.subtitle}>目的や教材ごとにフォルダとデッキを分けて、保存した英語を整理できます。</Text>
      </View>

      <View style={styles.segmentRow}>
        <Chip label="デッキ" selected={viewMode === "decks"} onPress={() => {
          clearCardSelection();
          setViewMode("decks");
        }} />
        <Chip label="単語カード" selected={viewMode === "cards"} onPress={() => setViewMode("cards")} />
      </View>

      {viewMode === "decks" ? (
        <ScrollView contentContainerStyle={styles.deckContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.sectionTitle}>{editingDeckId ? "デッキを編集" : "デッキを追加"}</Text>
                <Text style={styles.helperText}>授業、TOEIC、会話、読書などで分けられます。</Text>
              </View>
              <FolderPlus size={22} color={colors.primary} />
            </View>
            <AppInput label="デッキ名" value={deckName} onChangeText={setDeckName} placeholder="TOEIC / 授業 / YouTube" />
            <AppInput label="フォルダ" value={deckFolder} onChangeText={setDeckFolder} placeholder="試験対策 / 学校 / 趣味" />
            <View style={styles.formActions}>
              <AppButton label={editingDeckId ? "更新" : "追加"} onPress={() => void saveDeck()} />
              {editingDeckId ? <AppButton label="キャンセル" variant="secondary" onPress={clearDeckForm} /> : null}
            </View>
          </View>

          {decks.length === 0 ? (
            <EmptyState
              title="デッキがありません"
              description="最初のデッキを作ると、単語を目的別に整理できます。"
              actionLabel="デッキ名を入力する"
              onAction={() => undefined}
            />
          ) : (
            deckGroups.map(group => (
              <FolderSection
                key={group.folder}
                folder={group.folder}
                totalCards={group.decks.reduce((sum, deck) => sum + (deckCounts.get(deck.id) ?? 0), 0)}
              >
                {group.decks.map(deck => (
                  <DeckRow
                    key={deck.id}
                    deck={deck}
                    count={deckCounts.get(deck.id) ?? 0}
                    onOpen={() => openDeck(deck)}
                    onEdit={() => startEditDeck(deck)}
                    onDelete={() => confirmDeleteDeck(deck)}
                  />
                ))}
              </FolderSection>
            ))
          )}
        </ScrollView>
      ) : (
        <View style={styles.cardsPane}>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroller} contentContainerStyle={styles.tabsContent}>
            <Chip label="全デッキ" selected={!selectedDeckId} onPress={() => {
              clearCardSelection();
              setSelectedDeckId(null);
            }} />
            {decks.map(deck => (
              <Chip key={deck.id} label={deck.name} selected={selectedDeckId === deck.id} onPress={() => {
                clearCardSelection();
                setSelectedDeckId(deck.id);
              }} />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroller} contentContainerStyle={styles.tabsContent}>
            {filterItems.map(item => (
              <Chip key={item.value} label={item.label} selected={filter === item.value} onPress={() => {
                clearCardSelection();
                setFilter(item.value);
              }} />
            ))}
          </ScrollView>

          <View style={styles.listHeader}>
            <Text style={styles.countText}>
              {selectedDeck ? `${selectedDeck.name} / ` : ""}{filteredCards.length}件
            </Text>
            {filteredCards.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={selectionMode ? "表示中の単語カードをすべて選択する" : "単語カードを選択する"}
                onPress={selectionMode ? selectAllVisibleCards : () => setIsSelectingCards(true)}
              >
                <Text style={styles.textLink}>{selectionMode ? "すべて選択" : "選択"}</Text>
              </Pressable>
            ) : null}
          </View>

          {selectionMode ? (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkText}>{selectedCount}件選択中</Text>
              {confirmingBulkDelete ? (
                <Text style={styles.confirmText}>選択した単語カードを削除します。元に戻すにはバックアップが必要です。</Text>
              ) : null}
              <View style={styles.bulkActions}>
                <AppButton label="キャンセル" variant="secondary" onPress={clearCardSelection} />
                {confirmingBulkDelete ? (
                  <AppButton label="削除を確定" variant="danger" disabled={selectedCount === 0} onPress={() => void executeBulkDelete()} />
                ) : (
                  <AppButton label="一括削除" variant="danger" disabled={selectedCount === 0} onPress={() => setConfirmingBulkDelete(true)} />
                )}
              </View>
            </View>
          ) : null}

          <FlatList
            data={filteredCards}
            contentContainerStyle={styles.list}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => (
              <CardPreview
                card={item}
                selectionMode={selectionMode}
                selected={selectedCardIds.has(item.id)}
                onLongPress={() => toggleCardSelection(item.id)}
                onPress={() => {
                  if (selectionMode) {
                    toggleCardSelection(item.id);
                    return;
                  }
                  router.push(`/card/${item.id}`);
                }}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                title="条件に合う単語カードがありません"
                description="デッキやフィルターを変えるか、新しい単語を追加してみましょう。"
                actionLabel="単語を追加"
                onAction={() => router.push("/quick-add")}
              />
            }
          />
        </View>
      )}
    </View>
  );
}

function FolderSection({
  folder,
  totalCards,
  children
}: {
  folder: string;
  totalCards: number;
  children: ReactNode;
}): JSX.Element {
  return (
    <View style={styles.folderGroup}>
      <View style={styles.folderHeader}>
        <View style={styles.folderTitleRow}>
          <Folder size={20} color={colors.primary} />
          <Text style={styles.folderTitle}>{folder}</Text>
        </View>
        <Text style={styles.folderCount}>{totalCards}件</Text>
      </View>
      <View style={styles.folderChildren}>{children}</View>
    </View>
  );
}

function DeckRow({
  deck,
  count,
  onOpen,
  onEdit,
  onDelete
}: {
  deck: Deck;
  count: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}): JSX.Element {
  return (
    <View style={styles.deckCard}>
      <View style={styles.deckStripe} />
      <Pressable accessibilityRole="button" accessibilityLabel={`${deck.name}デッキを開く`} onPress={onOpen} style={styles.deckMain}>
        <Text style={styles.deckName}>{deck.name}</Text>
        <Text style={styles.deckMeta}>{count}件の単語カード</Text>
      </Pressable>
      <View style={styles.deckActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${deck.name}を編集`} onPress={onEdit} hitSlop={8} style={styles.iconButton}>
          <Edit3 size={18} color={colors.primary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${deck.name}を削除`} onPress={onDelete} hitSlop={8} style={styles.iconButton}>
          <Trash2 size={18} color={colors.danger} />
        </Pressable>
      </View>
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

function countCardsByDeck(cards: Card[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.deck_id, (counts.get(card.deck_id) ?? 0) + 1);
  }
  return counts;
}

function groupDecksByFolder(decks: Deck[]): { folder: string; decks: Deck[] }[] {
  const groups = new Map<string, Deck[]>();
  for (const deck of decks) {
    const folder = deck.folder?.trim() || "フォルダなし";
    groups.set(folder, [...(groups.get(folder) ?? []), deck]);
  }
  return [...groups.entries()]
    .map(([folder, groupedDecks]) => ({
      folder,
      decks: groupedDecks.sort((a, b) => a.name.localeCompare(b.name, "ja"))
    }))
    .sort((a, b) => {
      if (a.folder === "フォルダなし") return 1;
      if (b.folder === "フォルダなし") return -1;
      return a.folder.localeCompare(b.folder, "ja");
    });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  segmentRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  deckContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: 112 },
  formCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  formHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  helperText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  formActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  folderGroup: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  folderHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  folderTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  folderTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  folderCount: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  folderChildren: {
    gap: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.primarySoft
  },
  deckCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  deckStripe: { width: 5, alignSelf: "stretch", borderRadius: 8, backgroundColor: colors.primary },
  deckMain: { flex: 1, gap: spacing.xs, alignSelf: "stretch", justifyContent: "center" },
  deckName: { color: colors.text, fontSize: 18, fontWeight: "900" },
  deckMeta: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  deckActions: { flexDirection: "row", gap: spacing.xs },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.primarySoft
  },
  cardsPane: {
    flex: 1,
    width: "100%",
    maxWidth: 1040,
    alignSelf: "center"
  },
  searchBox: {
    marginHorizontal: spacing.md,
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
  tabsScroller: { flexGrow: 0, marginTop: spacing.md, minHeight: 52, maxHeight: 56 },
  tabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    alignItems: "center"
  },
  listHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  countText: { color: colors.muted, fontWeight: "800" },
  textLink: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  bulkBar: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  bulkText: { color: colors.text, fontWeight: "900" },
  confirmText: { color: colors.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  bulkActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  list: { padding: spacing.md, paddingBottom: 112 }
});
