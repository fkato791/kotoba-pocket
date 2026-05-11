import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Card } from "@/domain/models";
import { colors, spacing } from "@/ui/theme";

interface CardPreviewProps {
  card: Card;
  onPress?: () => void;
}

export function CardPreview({ card, onPress }: CardPreviewProps): JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.term} numberOfLines={1}>{card.term}</Text>
        {card.is_pinned ? <Text style={styles.pin}>苦手</Text> : null}
      </View>
      <Text style={styles.meaning} numberOfLines={2}>{card.meaning_ja}</Text>
      <Text style={styles.meta}>{card.term_type.replace("_", " ")}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  term: { color: colors.text, fontSize: 18, fontWeight: "800", flex: 1 },
  meaning: { color: colors.text, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 12 },
  pin: { color: colors.warning, fontWeight: "700" }
});
