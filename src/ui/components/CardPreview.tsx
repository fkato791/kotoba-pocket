import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "@/domain/models";
import { colors, isClassicWindows, spacing } from "@/ui/theme";

interface CardPreviewProps {
  card: Card;
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
}

const termTypeLabel: Record<Card["term_type"], string> = {
  word: "単語",
  idiom: "イディオム",
  phrase: "フレーズ",
  phrasal_verb: "句動詞",
  collocation: "コロケーション"
};

export function CardPreview({ card, onPress, onLongPress, selected = false, selectionMode = false }: CardPreviewProps): JSX.Element {
  const status = getCardStatus(card);
  const imageUri = card.term_image_uri ?? card.meaning_image_uri;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.term}の単語カードを${selectionMode ? selected ? "選択解除" : "選択" : "開く"}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, selected && styles.selectedCard]}
    >
      <View style={styles.header}>
        <View style={styles.heading}>
          <View style={styles.termRow}>
            {selectionMode ? (
              <View style={[styles.selectionMark, selected && styles.selectionMarkSelected]}>
                <Text style={[styles.selectionMarkText, selected && styles.selectionMarkTextSelected]}>{selected ? "✓" : ""}</Text>
              </View>
            ) : null}
            <Text style={styles.term} numberOfLines={2}>{card.term}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.type}>{termTypeLabel[card.term_type]}</Text>
            {card.part_of_speech ? <Text style={styles.type}>{card.part_of_speech}</Text> : null}
          </View>
        </View>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.thumbnail} accessibilityLabel="添付画像" /> : null}
      </View>
      <Text style={styles.meaning} numberOfLines={3}>{card.meaning_ja}</Text>
      {card.note ? <Text style={styles.example} numberOfLines={2}>{card.note}</Text> : null}
      <View style={styles.footer}>
        <Text style={[styles.status, status === "苦手" && styles.hardStatus]}>{status}</Text>
        <Text style={styles.next}>{formatDue(card)}</Text>
      </View>
    </Pressable>
  );
}

function getCardStatus(card: Card): string {
  if (card.is_pinned || card.difficulty >= 3 || card.lapses > 0) return "苦手";
  if (!card.due_at) return "新規";
  if (card.due_at <= new Date().toISOString()) return "復習";
  return "学習中";
}

function formatDue(card: Card): string {
  if (!card.due_at) return "未学習";
  const due = new Date(card.due_at);
  const today = new Date();
  if (due.toDateString() === today.toDateString()) return "今日復習";
  return `次回 ${due.getMonth() + 1}/${due.getDate()}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: isClassicWindows ? 0 : 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOpacity: isClassicWindows ? 0 : 0.06,
    shadowRadius: isClassicWindows ? 0 : 10,
    shadowOffset: { width: 0, height: isClassicWindows ? 0 : 4 }
  },
  selectedCard: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  heading: { flex: 1, gap: spacing.sm },
  termRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  selectionMark: {
    width: 24,
    height: 24,
    borderRadius: isClassicWindows ? 0 : 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  selectionMarkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectionMarkText: { color: colors.muted, fontSize: 14, fontWeight: "900" },
  selectionMarkTextSelected: { color: colors.primaryText },
  term: { color: colors.text, fontSize: 22, fontWeight: "900", flex: 1, lineHeight: 28 },
  thumbnail: { width: 56, height: 56, borderRadius: isClassicWindows ? 0 : 8, backgroundColor: colors.border },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  type: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: isClassicWindows ? 0 : 8
  },
  meaning: { color: colors.text, fontSize: 16, lineHeight: 24 },
  example: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  next: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  status: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: isClassicWindows ? 0 : 8
  },
  hardStatus: { color: colors.warning, backgroundColor: colors.warningSoft }
});
