import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "@/domain/models";
import { colors, spacing } from "@/ui/theme";

interface CardPreviewProps {
  card: Card;
  onPress?: () => void;
}

const termTypeLabel: Record<Card["term_type"], string> = {
  word: "単語",
  idiom: "イディオム",
  phrase: "フレーズ",
  phrasal_verb: "句動詞",
  collocation: "コロケーション"
};

export function CardPreview({ card, onPress }: CardPreviewProps): JSX.Element {
  const status = getCardStatus(card);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.term} numberOfLines={1}>{card.term}</Text>
        <Text style={[styles.status, status === "苦手" && styles.hardStatus]}>{status}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.type}>{termTypeLabel[card.term_type]}</Text>
        {card.part_of_speech ? <Text style={styles.type}>{card.part_of_speech}</Text> : null}
      </View>
      <Text style={styles.meaning} numberOfLines={2}>{card.meaning_ja}</Text>
      {card.note ? <Text style={styles.example} numberOfLines={1}>{card.note}</Text> : null}
      <Text style={styles.next}>{formatDue(card)}</Text>
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
  return `次回: ${due.getMonth() + 1}/${due.getDate()}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  term: { color: colors.text, fontSize: 20, fontWeight: "900", flex: 1 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  type: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: colors.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8
  },
  meaning: { color: colors.text, fontSize: 15, lineHeight: 22 },
  example: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  next: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  status: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8
  },
  hardStatus: { color: colors.warning, backgroundColor: "#FEF3C7" }
});
