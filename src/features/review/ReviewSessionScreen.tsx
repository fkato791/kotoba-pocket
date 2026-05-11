import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { listCards, recordReview } from "@/data/repositories/cardRepository";
import type { Card, ReviewMode, ReviewRating } from "@/domain/models";
import { checkTypingRecall } from "@/features/review/modes";
import { buildTodayQueue } from "@/features/review/reviewQueue";
import { nowIso } from "@/lib/time";
import { AppButton } from "@/ui/components/AppButton";
import { Chip } from "@/ui/components/Chip";
import { EmptyState } from "@/ui/components/EmptyState";
import { ReviewRatingBar } from "@/ui/components/ReviewRatingBar";
import { colors, spacing } from "@/ui/theme";

const modeLabels: Record<ReviewMode, string> = {
  flashcard: "カード",
  mcq: "選択",
  cloze: "穴埋め",
  typing: "入力"
};

const presetLabels = ["30秒", "1分", "3分", "無制限"] as const;

export function ReviewSessionScreen(): JSX.Element {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [preset, setPreset] = useState<(typeof presetLabels)[number]>("1分");
  const [typing, setTyping] = useState("");
  const [completed, setCompleted] = useState(0);
  const queue = useMemo(() => buildTodayQueue(cards, nowIso()), [cards]);
  const card = queue[index];
  const choices = useMemo(() => {
    if (!card) return [];
    const otherMeanings = queue.filter(item => item.id !== card.id).map(item => item.meaning_ja).slice(0, 3);
    return [card.meaning_ja, ...otherMeanings].sort((a, b) => a.localeCompare(b, "ja"));
  }, [card, queue]);

  useEffect(() => {
    void listCards({ archived: false }).then(setCards);
  }, []);

  async function rate(rating: ReviewRating): Promise<void> {
    if (!card) return;
    await recordReview(card, mode, rating, 0);
    setCompleted(value => value + 1);
    setRevealed(false);
    setTyping("");
    setIndex(value => value + 1);
  }

  if (!card) {
    return <EmptyState title={completed > 0 ? "おつかれさまです" : "今日の復習はありません"} description={`${completed}枚を復習しました`} />;
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.progress}>{index + 1} / {queue.length}</Text>
      <View style={styles.modeRow}>
        {(["flashcard", "mcq", "cloze", "typing"] as ReviewMode[]).map(item => (
          <Chip key={item} label={modeLabels[item]} selected={mode === item} onPress={() => setMode(item)} />
        ))}
      </View>
      <View style={styles.modeRow}>
        {presetLabels.map(item => (
          <Chip key={item} label={item} selected={preset === item} onPress={() => setPreset(item)} />
        ))}
      </View>
      <View style={styles.promptPanel}>
        <Text style={styles.prompt}>{mode === "cloze" ? `_____ : ${card.meaning_ja}` : card.term}</Text>
        {mode === "cloze" ? <Text style={styles.hint}>英語を思い出してください</Text> : null}
        {mode === "mcq" && !revealed ? (
          <View style={styles.choices}>
            {choices.map(choice => (
              <AppButton
                key={choice}
                label={choice}
                variant="secondary"
                onPress={() => {
                  if (choice === card.meaning_ja) void rate("good");
                  else setRevealed(true);
                }}
              />
            ))}
          </View>
        ) : null}
        {mode === "typing" ? (
          <TextInput
            value={typing}
            onChangeText={setTyping}
            placeholder="日本語の意味を入力"
            style={styles.typing}
            placeholderTextColor={colors.muted}
          />
        ) : null}
        {revealed ? <Text style={styles.answer}>{card.meaning_ja}</Text> : null}
      </View>
      {!revealed && mode !== "mcq" ? (
        <AppButton
          label={mode === "typing" ? "答え合わせ" : "答えを見る"}
          onPress={() => {
            if (mode === "typing" && checkTypingRecall(card.meaning_ja, typing)) {
              void rate("good");
            } else {
              setRevealed(true);
            }
          }}
        />
      ) : (
        <ReviewRatingBar onRate={rating => void rate(rating)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background },
  progress: { color: colors.muted, fontWeight: "700", textAlign: "center" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  promptPanel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg
  },
  prompt: { color: colors.text, fontSize: 36, fontWeight: "900", textAlign: "center" },
  answer: { color: colors.text, fontSize: 24, fontWeight: "700", textAlign: "center" },
  hint: { color: colors.muted, fontWeight: "700", textAlign: "center" },
  choices: { alignSelf: "stretch", gap: spacing.sm },
  typing: {
    minHeight: 52,
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    backgroundColor: colors.background
  }
});
