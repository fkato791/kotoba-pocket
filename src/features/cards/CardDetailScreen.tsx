import { useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Volume2 } from "lucide-react-native";
import { getCard, listCards, updateCard } from "@/data/repositories/cardRepository";
import type { Card, TermType } from "@/domain/models";
import { nativeTtsProvider } from "@/features/audio/tts";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { colors, spacing } from "@/ui/theme";

const termTypeItems: { label: string; value: TermType }[] = [
  { label: "単語", value: "word" },
  { label: "イディオム", value: "idiom" },
  { label: "フレーズ", value: "phrase" },
  { label: "句動詞", value: "phrasal_verb" },
  { label: "コロケーション", value: "collocation" }
];

export function CardDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<Card | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const isDirty = useMemo(() => Boolean(card), [card]);

  useEffect(() => {
    if (!id) return;
    void getCard(id).then(setCard);
  }, [id]);

  useEffect(() => {
    if (!card?.term.trim()) return;
    void listCards({ q: card.term.trim() }).then(cards => {
      setDuplicateCount(cards.filter(item => item.id !== card.id && item.term.trim().toLowerCase() === card.term.trim().toLowerCase()).length);
    });
  }, [card?.id, card?.term]);

  if (!card) return <EmptyState title="単語カードが見つかりません" />;

  async function save(patch: Partial<Card> = {}): Promise<void> {
    if (!card) return;
    const updated = await updateCard(card.id, { ...card, ...patch });
    setCard(updated);
    if (Object.keys(patch).length === 0) Alert.alert("保存しました");
  }

  function confirmArchive(): void {
    if (!card) return;
    const nextArchived = !card.is_archived;
    Alert.alert(
      nextArchived ? "アーカイブしますか？" : "アーカイブを解除しますか？",
      nextArchived ? "復習や通常の一覧からは表示されなくなります。" : "通常の一覧と復習対象に戻ります。",
      [
        { text: "キャンセル", style: "cancel" },
        { text: nextArchived ? "アーカイブ" : "解除", onPress: () => void save({ is_archived: nextArchived }) }
      ]
    );
  }

  function confirmDelete(): void {
    if (!card) return;
    const currentCard = card;
    Alert.alert("削除しますか？", "この単語カードは一覧から消えます。CSV/JSONバックアップがない場合は復元できません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => void updateCard(currentCard.id, { deleted_at: new Date().toISOString() }).then(() => router.replace("/collection"))
      }
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{card.term || "単語カード編集"}</Text>
        <Text style={styles.subtitle}>英語・意味・種類・メモを編集できます。</Text>
      </View>

      {duplicateCount > 0 ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>同じ英語の単語カードが{duplicateCount}件あります。</Text>
        </View>
      ) : null}

      <View style={styles.panel}>
        <AppInput label="英語" value={card.term} onChangeText={term => setCard({ ...card, term })} />
        <ImagePreview label="英語の写真" uri={card.term_image_uri} />
        <AppInput label="意味" value={card.meaning_ja} onChangeText={meaning_ja => setCard({ ...card, meaning_ja })} multiline />
        <ImagePreview label="意味の写真" uri={card.meaning_image_uri} />
        <Text style={styles.label}>種類</Text>
        <View style={styles.wrapRow}>
          {termTypeItems.map(item => (
            <Chip key={item.value} label={item.label} selected={card.term_type === item.value} onPress={() => setCard({ ...card, term_type: item.value })} />
          ))}
        </View>
        <AppInput label="品詞" value={card.part_of_speech ?? ""} onChangeText={part_of_speech => setCard({ ...card, part_of_speech })} placeholder="verb / noun / adjective" />
        <AppInput label="メモ" value={card.note ?? ""} onChangeText={note => setCard({ ...card, note })} multiline />
        <AppInput label="出典テキスト" value={card.source_text ?? ""} onChangeText={source_text => setCard({ ...card, source_text })} multiline />
        <AppInput label="出典URL" value={card.source_url ?? ""} onChangeText={source_url => setCard({ ...card, source_url })} autoCapitalize="none" />
      </View>

      <View style={styles.row}>
        <View style={styles.switchText}>
          <Text style={styles.label}>苦手として固定</Text>
          <Text style={styles.meta}>ホームや復習で見つけやすくします。</Text>
        </View>
        <Switch value={card.is_pinned} onValueChange={is_pinned => void save({ is_pinned })} />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>復習履歴</Text>
        <Text style={styles.meta}>間隔: {card.scheduled_days}日 / 失敗: {card.lapses}回 / 難しさ: {card.difficulty}</Text>
        <Text style={styles.meta}>次回: {card.due_at ? new Date(card.due_at).toLocaleDateString("ja-JP") : "未学習"}</Text>
      </View>

      <AppButton
        label="発音を再生"
        variant="secondary"
        icon={<Volume2 size={18} color={colors.text} />}
        onPress={() => void nativeTtsProvider.speak(card.term).catch(() => Alert.alert("音声を再生できません"))}
      />
      <AppButton label="変更を保存" disabled={!isDirty || !card.term.trim() || !card.meaning_ja.trim()} onPress={() => void save()} />
      <AppButton label={card.is_archived ? "アーカイブ解除" : "アーカイブ"} variant="secondary" onPress={confirmArchive} />
      <AppButton label="削除" variant="danger" onPress={confirmDelete} />
    </ScrollView>
  );
}

function ImagePreview({ label, uri }: { label: string; uri: string | null }): JSX.Element | null {
  if (!uri) return null;
  return (
    <View style={styles.imageRow}>
      <Image source={{ uri }} style={styles.image} accessibilityLabel={`${label}のプレビュー`} />
      <Text style={styles.meta}>{label}: 添付あり</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background, paddingBottom: 112 },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, padding: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  switchText: { flex: 1, gap: spacing.xs },
  label: { color: colors.text, fontWeight: "800" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  warningBox: { padding: spacing.md, borderRadius: 8, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning },
  warningText: { color: colors.warning, fontWeight: "800" },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background
  },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.border },
  panel: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md
  },
  panelTitle: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.muted, lineHeight: 20 }
});
