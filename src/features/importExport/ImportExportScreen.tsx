import { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { createCard, listCards } from "@/data/repositories/cardRepository";
import { findOrCreateDeck } from "@/data/repositories/deckRepository";
import { cardsToCsv, csvTemplate, previewCsv, type CsvPreviewRow } from "@/features/importExport/csv";
import type { Card } from "@/domain/models";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { colors, spacing } from "@/ui/theme";

export function ImportExportScreen(): JSX.Element {
  const [csv, setCsv] = useState("");
  const [json, setJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const preview = useMemo(() => (csv.trim() ? previewCsv(csv) : null), [csv]);
  const jsonPreview = useMemo(() => previewJsonBackup(json), [json]);

  async function importCsvRows(rows: CsvPreviewRow[]): Promise<void> {
    setImporting(true);
    try {
      for (const row of rows) {
        const deck = await findOrCreateDeck(row.deck);
        await createCard({
          term: row.term,
          meaning_ja: row.meaning_ja,
          term_type: row.term_type,
          part_of_speech: row.part_of_speech,
          example_sentence_en: row.example_sentence_en,
          example_sentence_ja: row.example_sentence_ja,
          note: row.note,
          source_text: row.source_text,
          source_url: row.source_url,
          tags: parseTags(row.tags),
          deck_id: deck.id,
          auto_pronunciation: true
        });
      }
      Alert.alert("インポート完了", `${rows.length}件のカードを追加しました。`);
      setCsv("");
    } finally {
      setImporting(false);
    }
  }

  async function exportCsv(): Promise<void> {
    setExporting(true);
    try {
      const cards = await listCards({ archived: false });
      await shareText(cardsToCsv(cards), "kotoba-pocket-cards.csv", "text/csv;charset=utf-8");
      Alert.alert("CSVを書き出しました", `${cards.length}件のカードを出力しました。`);
    } finally {
      setExporting(false);
    }
  }

  async function exportJson(): Promise<void> {
    setExporting(true);
    try {
      const cards = await listCards();
      const payload = JSON.stringify({ exported_at: new Date().toISOString(), cards }, null, 2);
      await shareText(payload, "kotoba-pocket-backup.json", "application/json;charset=utf-8");
      Alert.alert("JSONを書き出しました", `${cards.length}件のカードを含むバックアップを出力しました。`);
    } finally {
      setExporting(false);
    }
  }

  async function importJsonBackup(cards: Card[]): Promise<void> {
    setImporting(true);
    try {
      const deck = await findOrCreateDeck("Imported");
      for (const card of cards) {
        await createCard({
          term: card.term,
          meaning_ja: card.meaning_ja,
          term_type: card.term_type,
          part_of_speech: card.part_of_speech ?? undefined,
          note: card.note ?? undefined,
          source_text: card.source_text ?? undefined,
          source_url: card.source_url ?? undefined,
          tags: [],
          deck_id: deck.id,
          auto_pronunciation: true
        });
      }
      Alert.alert("JSON復元完了", `${cards.length}件のカードを追加しました。`);
      setJson("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>データ</Text>
        <Text style={styles.subtitle}>ログイン同期を使わなくても、CSVとJSONでローカルデータを持ち出せます。</Text>
      </View>

      <Section title="CSVインポート">
        <AppButton
          label="CSVサンプルをコピー"
          variant="secondary"
          onPress={() => void Clipboard.setStringAsync(csvTemplate).then(() => Alert.alert("コピーしました"))}
        />
        <AppInput
          label="CSVを貼り付け"
          value={csv}
          onChangeText={setCsv}
          multiline
          placeholder={csvTemplate}
        />
        {preview ? (
          <View style={styles.reportBox}>
            <Text style={styles.report}>有効: {preview.validRows.length}件 / エラー: {preview.errors.length}件</Text>
            {preview.validRows.slice(0, 3).map((row, index) => (
              <Text key={`${row.term}-${index}`} style={styles.previewText}>・{row.term} - {row.meaning_ja}</Text>
            ))}
            {preview.errors.slice(0, 3).map(error => (
              <Text key={`${error.row}-${error.message}`} style={styles.errorText}>行{error.row}: {error.message}</Text>
            ))}
          </View>
        ) : null}
        <AppButton
          label="プレビューしたCSVを追加"
          loading={importing}
          disabled={!preview || preview.validRows.length === 0}
          onPress={() => preview ? void importCsvRows(preview.validRows) : undefined}
        />
      </Section>

      <Section title="JSONバックアップ復元">
        <AppInput
          label="JSONを貼り付け"
          value={json}
          onChangeText={setJson}
          multiline
          placeholder='{"exported_at":"...","cards":[{"term":"look up","meaning_ja":"調べる","term_type":"phrasal_verb"}]}'
        />
        {json.trim() ? (
          <View style={styles.reportBox}>
            <Text style={styles.report}>
              {jsonPreview.error ? "JSONを確認してください" : `復元可能: ${jsonPreview.cards.length}件`}
            </Text>
            {jsonPreview.error ? <Text style={styles.errorText}>{jsonPreview.error}</Text> : null}
            {jsonPreview.cards.slice(0, 3).map((card, index) => (
              <Text key={`${card.term}-${index}`} style={styles.previewText}>・{card.term} - {card.meaning_ja}</Text>
            ))}
          </View>
        ) : null}
        <AppButton
          label="JSONバックアップを復元"
          loading={importing}
          disabled={jsonPreview.cards.length === 0 || Boolean(jsonPreview.error)}
          onPress={() => void importJsonBackup(jsonPreview.cards)}
        />
      </Section>

      <Section title="エクスポート">
        <AppButton label="CSVを書き出す" variant="secondary" loading={exporting} onPress={() => void exportCsv()} />
        <AppButton label="JSONバックアップを書き出す" variant="secondary" loading={exporting} onPress={() => void exportJson()} />
        <Text style={styles.helper}>Webではファイルをダウンロードします。スマホでは共有シートまたはクリップボードを使います。</Text>
      </Section>

      <Section title="ログイン同期">
        <Text style={styles.helper}>マジックリンク同期は保留中です。ローカル保存・復習・CSV/JSONバックアップはそのまま利用できます。</Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function parseTags(tags?: string): string[] {
  return tags?.split(/[;,]/).map(tag => tag.trim()).filter(Boolean) ?? [];
}

async function shareText(content: string, fileName: string, mimeType: string): Promise<void> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Clipboard.setStringAsync(content);
}

function previewJsonBackup(input: string): { cards: Card[]; error: string | null } {
  if (!input.trim()) return { cards: [], error: null };
  try {
    const parsed = JSON.parse(input) as { cards?: unknown };
    if (!Array.isArray(parsed.cards)) return { cards: [], error: "cards配列が見つかりません。" };
    const cards = parsed.cards.filter(isImportableCard);
    if (cards.length === 0) return { cards: [], error: "復元できるカードがありません。" };
    return { cards, error: null };
  } catch {
    return { cards: [], error: "JSONの形式が正しくありません。" };
  }
}

function isImportableCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<Card>;
  return Boolean(card.term && card.meaning_ja && card.term_type);
}

const styles = StyleSheet.create({
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: spacing.lg, gap: spacing.md, backgroundColor: colors.background, paddingBottom: 112 },
  header: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 26, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  section: {
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  reportBox: { gap: spacing.xs, padding: spacing.md, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  report: { color: colors.text, fontWeight: "800" },
  previewText: { color: colors.text, lineHeight: 20 },
  errorText: { color: colors.danger, lineHeight: 20 },
  helper: { color: colors.muted, lineHeight: 20 }
});
