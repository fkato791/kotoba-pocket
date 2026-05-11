import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { createCard } from "@/data/repositories/cardRepository";
import { ensureDefaultDeck, listDecks } from "@/data/repositories/deckRepository";
import type { Deck, TermType } from "@/domain/models";
import { quickAddCardSchema } from "@/domain/schemas";
import { analytics } from "@/features/analytics/analytics";
import { hasSensitiveContent } from "@/lib/privacy/sensitiveContent";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { Chip } from "@/ui/components/Chip";
import { colors, spacing } from "@/ui/theme";

const termTypes: { label: string; value: TermType }[] = [
  { label: "単語", value: "word" },
  { label: "イディオム", value: "idiom" },
  { label: "フレーズ", value: "phrase" },
  { label: "句動詞", value: "phrasal_verb" },
  { label: "連語", value: "collocation" }
];

export function QuickAddScreen(): JSX.Element {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [term, setTerm] = useState("");
  const [meaningJa, setMeaningJa] = useState("");
  const [termType, setTermType] = useState<TermType>("word");
  const [advanced, setAdvanced] = useState(false);
  const [partOfSpeech, setPartOfSpeech] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [exampleJa, setExampleJa] = useState("");
  const [note, setNote] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void ensureDefaultDeck().then(deck => {
      setDeckId(deck.id);
      return listDecks().then(setDecks);
    });
  }, []);

  async function save(addNext: boolean): Promise<void> {
    const parsed = quickAddCardSchema.safeParse({
      term,
      meaning_ja: meaningJa,
      term_type: termType,
      part_of_speech: partOfSpeech,
      example_sentence_en: exampleEn,
      example_sentence_ja: exampleJa,
      note,
      source_text: sourceText,
      source_url: sourceUrl,
      tags: [],
      deck_id: deckId
    });
    if (!parsed.success) {
      Alert.alert("入力を確認してください", parsed.error.issues[0]?.message ?? "保存できませんでした");
      return;
    }
    if (hasSensitiveContent(term, meaningJa, note, sourceText)) {
      Alert.alert("個人情報の可能性", "カードや出典に個人情報らしき内容があります。保存前に確認してください。");
    }
    setSaving(true);
    try {
      await createCard(parsed.data);
      analytics.track("card_created", { term_type: termType });
      if (addNext) {
        setTerm("");
        setMeaningJa("");
        setExampleEn("");
        setExampleJa("");
        setNote("");
        setSourceText("");
        setSourceUrl("");
      } else {
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppInput label="英語" value={term} onChangeText={setTerm} placeholder="take it for granted" autoFocus />
        <AppInput label="意味" value={meaningJa} onChangeText={setMeaningJa} placeholder="当然だと思う" />
        <Text style={styles.label}>種類</Text>
        <View style={styles.wrapRow}>
          {termTypes.map(item => (
            <Chip key={item.value} label={item.label} selected={termType === item.value} onPress={() => setTermType(item.value)} />
          ))}
        </View>
        <Text style={styles.label}>デッキ</Text>
        <View style={styles.wrapRow}>
          {decks.map(deck => (
            <Chip key={deck.id} label={deck.name} selected={deck.id === deckId} onPress={() => setDeckId(deck.id)} />
          ))}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>詳細項目</Text>
          <Switch value={advanced} onValueChange={setAdvanced} />
        </View>
        {advanced ? (
          <View style={styles.advanced}>
            <AppInput label="品詞" value={partOfSpeech} onChangeText={setPartOfSpeech} placeholder="verb" />
            <AppInput label="例文（英語）" value={exampleEn} onChangeText={setExampleEn} multiline />
            <AppInput label="例文（日本語）" value={exampleJa} onChangeText={setExampleJa} multiline />
            <AppInput label="メモ" value={note} onChangeText={setNote} multiline />
            <AppInput label="出典テキスト" value={sourceText} onChangeText={setSourceText} multiline />
            <AppInput label="出典URL" value={sourceUrl} onChangeText={setSourceUrl} autoCapitalize="none" />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <AppButton label="保存して次へ" variant="secondary" loading={saving} onPress={() => void save(true)} />
        <AppButton label="保存" loading={saving} onPress={() => void save(false)} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 140 },
  label: { color: colors.text, fontWeight: "800" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  advanced: { gap: spacing.md },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border
  }
});
