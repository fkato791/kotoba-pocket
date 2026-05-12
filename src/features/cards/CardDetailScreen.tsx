import { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Volume2 } from "lucide-react-native";
import { getCard, updateCard } from "@/data/repositories/cardRepository";
import type { Card } from "@/domain/models";
import { nativeTtsProvider } from "@/features/audio/tts";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { EmptyState } from "@/ui/components/EmptyState";
import { colors, spacing } from "@/ui/theme";

export function CardDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<Card | null>(null);

  useEffect(() => {
    if (id) void getCard(id).then(setCard);
  }, [id]);

  if (!card) return <EmptyState title="カードが見つかりません" />;

  async function save(patch: Partial<Card>): Promise<void> {
    if (!card) return;
    const updated = await updateCard(card.id, patch);
    setCard(updated);
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppInput label="英語" value={card.term} onChangeText={term => setCard({ ...card, term })} />
      <ImagePreview label="英語の写真" uri={card.term_image_uri} />
      <AppInput label="意味" value={card.meaning_ja} onChangeText={meaning_ja => setCard({ ...card, meaning_ja })} multiline />
      <ImagePreview label="意味の写真" uri={card.meaning_image_uri} />
      <AppInput label="メモ" value={card.note ?? ""} onChangeText={note => setCard({ ...card, note })} multiline />
      <View style={styles.row}>
        <Text style={styles.label}>苦手として固定</Text>
        <Switch value={card.is_pinned} onValueChange={is_pinned => void save({ is_pinned })} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>復習履歴</Text>
        <Text style={styles.meta}>間隔: {card.scheduled_days}日 / 失敗: {card.lapses}回 / 難しさ: {card.difficulty}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>音声</Text>
        <Text style={styles.meta}>英語の発音は端末TTSで再生できます。</Text>
      </View>
      <AppButton
        label="発音を再生"
        variant="secondary"
        icon={<Volume2 size={18} color={colors.text} />}
        onPress={() => void nativeTtsProvider.speak(card.term).catch(() => Alert.alert("音声を再生できません"))}
      />
      <AppButton label="変更を保存" onPress={() => void save(card)} />
      <AppButton label={card.is_archived ? "アーカイブ解除" : "アーカイブ"} variant="secondary" onPress={() => void save({ is_archived: !card.is_archived })} />
      <AppButton label="削除" variant="danger" onPress={() => void save({ deleted_at: new Date().toISOString() })} />
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
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: colors.text, fontWeight: "800" },
  imageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  image: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.border },
  panel: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs
  },
  panelTitle: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.muted }
});
