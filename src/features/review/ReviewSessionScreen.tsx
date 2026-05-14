import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
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
  flashcard: "単語カード",
  mcq: "選択",
  cloze: "穴埋め",
  typing: "入力"
};

const presetItems = [
  { label: "30秒", seconds: 30 },
  { label: "1分", seconds: 60 },
  { label: "3分", seconds: 180 },
  { label: "無制限", seconds: null }
] as const;

type SessionPreset = (typeof presetItems)[number];

export function ReviewSessionScreen(): JSX.Element {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [preset, setPreset] = useState<SessionPreset>(presetItems[1]);
  const [typing, setTyping] = useState("");
  const [typingResult, setTypingResult] = useState<"correct" | "miss" | null>(null);
  const [completed, setCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const queue = useMemo(() => buildTodayQueue(cards, nowIso()), [cards]);
  const sessionEndedByTime = preset.seconds !== null && now - startedAt >= preset.seconds * 1000;
  const card = sessionEndedByTime ? undefined : queue[index];
  const choices = useMemo(() => buildChoices(card, cards), [card, cards]);

  useEffect(() => {
    void listCards({ archived: false }).then(setCards);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function rate(rating: ReviewRating): Promise<void> {
    if (!card) return;
    await recordReview(card, mode, rating, 0);
    setCompleted(value => value + 1);
    setRevealed(false);
    setTyping("");
    setTypingResult(null);
    setIndex(value => value + 1);
  }

  function resetSession(): void {
    setIndex(0);
    setCompleted(0);
    setRevealed(false);
    setTyping("");
    setTypingResult(null);
    setStartedAt(Date.now());
    setNow(Date.now());
  }

  function selectPreset(nextPreset: SessionPreset): void {
    setPreset(nextPreset);
    resetSession();
  }

  if (!card) {
    return (
      <ScrollView contentContainerStyle={styles.endScreen}>
        <EmptyState
          title={completed > 0 ? "復習完了です" : "今日の復習はありません"}
          description={completed > 0 ? `${completed}件を復習しました。おつかれさまでした。` : "新しい単語を追加すると、ここからすぐに復習できます。"}
          actionLabel="単語を追加"
          onAction={() => router.push("/quick-add")}
        />
        <View style={styles.summaryPanel}>
          <Text style={styles.summaryTitle}>セッション結果</Text>
          <Text style={styles.summaryText}>復習した単語カード: {completed}件</Text>
          <Text style={styles.summaryText}>時間: {formatElapsed(now - startedAt)}</Text>
          <Text style={styles.summaryText}>設定: {preset.label}</Text>
        </View>
        <View style={styles.endActions}>
          <AppButton label="もう一度復習" variant="secondary" onPress={resetSession} />
          <AppButton label="ホームへ戻る" onPress={() => router.replace("/")} />
          <AppButton label="単語帳を見る" variant="secondary" onPress={() => router.push("/collection")} />
          <AppButton label="学習記録を見る" variant="secondary" onPress={() => router.push("/study-stats")} />
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.progress}>{index + 1} / {queue.length}</Text>
        <Text style={styles.progress}>{formatElapsed(now - startedAt)}</Text>
      </View>

      <View style={styles.modeRow}>
        {(["flashcard", "mcq", "cloze", "typing"] as ReviewMode[]).map(item => (
          <Chip key={item} label={modeLabels[item]} selected={mode === item} onPress={() => {
            setMode(item);
            setRevealed(false);
            setTyping("");
            setTypingResult(null);
          }} />
        ))}
      </View>

      <View style={styles.timePanel}>
        <View style={styles.timeHeader}>
          <Text style={styles.timeTitle}>復習時間</Text>
          <Text style={styles.timeValue}>{preset.label}</Text>
        </View>
        <View style={styles.modeRow}>
          {presetItems.map(item => (
            <Chip
              key={item.label}
              label={item.label}
              selected={preset.label === item.label}
              onPress={() => selectPreset(item)}
            />
          ))}
        </View>
      </View>

      <View style={styles.promptPanel}>
        <Text style={styles.modeCaption}>{modeLabels[mode]}</Text>
        <Text style={styles.prompt}>{mode === "cloze" ? "_____" : card.term}</Text>
        {mode === "cloze" ? <Text style={styles.hint}>{card.meaning_ja}</Text> : null}
        {card.note ? <Text style={styles.note} numberOfLines={2}>{card.note}</Text> : null}
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
          <View style={styles.typingWrap}>
            <TextInput
              value={typing}
              onChangeText={value => {
                setTyping(value);
                setTypingResult(null);
              }}
              placeholder="日本語の意味を入力"
              style={styles.typing}
              placeholderTextColor={colors.muted}
            />
            {typingResult ? (
              <Text style={[styles.resultText, typingResult === "correct" ? styles.correct : styles.miss]}>
                {typingResult === "correct" ? "正解です" : "答えを確認しましょう"}
              </Text>
            ) : null}
          </View>
        ) : null}
        {revealed ? <Text style={styles.answer}>{card.meaning_ja}</Text> : null}
      </View>

      {!revealed && mode !== "mcq" ? (
        <AppButton
          label={mode === "typing" ? "答え合わせ" : "答えを見る"}
          onPress={() => {
            if (mode === "typing" && checkTypingRecall(card.meaning_ja, typing)) {
              setTypingResult("correct");
              void rate("good");
            } else {
              if (mode === "typing") setTypingResult("miss");
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

function buildChoices(card: Card | undefined, cards: Card[]): string[] {
  if (!card) return [];
  const distractors = cards
    .filter(item => item.id !== card.id && item.meaning_ja !== card.meaning_ja)
    .map(item => item.meaning_ja)
    .slice(0, 3);
  return [card.meaning_ja, ...distractors].sort((a, b) => a.localeCompare(b, "ja"));
}

function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background, paddingBottom: 112 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progress: { color: colors.muted, fontWeight: "800" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  timePanel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  timeHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, alignItems: "center" },
  timeTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  timeValue: { color: colors.primary, fontSize: 18, fontWeight: "900" },
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
  modeCaption: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  prompt: { color: colors.text, fontSize: 36, fontWeight: "900", textAlign: "center" },
  answer: { color: colors.text, fontSize: 24, fontWeight: "700", textAlign: "center" },
  hint: { color: colors.muted, fontSize: 18, fontWeight: "800", textAlign: "center" },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" },
  choices: { alignSelf: "stretch", gap: spacing.sm },
  typingWrap: { alignSelf: "stretch", gap: spacing.sm },
  typing: {
    minHeight: 52,
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    fontSize: 18,
    backgroundColor: colors.background,
    color: colors.text
  },
  resultText: { fontWeight: "900", textAlign: "center" },
  correct: { color: colors.success },
  miss: { color: colors.warning },
  endScreen: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
    paddingBottom: 112
  },
  summaryPanel: { padding: spacing.md, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.xs },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  summaryText: { color: colors.text, lineHeight: 22 },
  endActions: {
    gap: spacing.sm
  }
});
