import { useMemo, useState, type ReactNode } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { createCard, listCards } from "@/data/repositories/cardRepository";
import { findOrCreateDeck } from "@/data/repositories/deckRepository";
import { cardsToCsv, csvTemplate, previewCsv, type CsvPreviewRow } from "@/features/importExport/csv";
import { cardsToExcelArray, cardsToExcelBase64, createExcelTemplateArray, previewExcel } from "@/features/importExport/excel";
import type { Card } from "@/domain/models";
import { AppButton } from "@/ui/components/AppButton";
import { AppInput } from "@/ui/components/AppInput";
import { ErrorBanner } from "@/ui/components/ErrorBanner";
import { colors, spacing } from "@/ui/theme";

export function ImportExportScreen(): JSX.Element {
  const [csv, setCsv] = useState("");
  const [json, setJson] = useState("");
  const [excelFileName, setExcelFileName] = useState("");
  const [excelPreview, setExcelPreview] = useState<ReturnType<typeof previewCsv> | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [skippedDuplicates, setSkippedDuplicates] = useState(0);
  const preview = useMemo(() => (csv.trim() ? previewCsv(csv) : null), [csv]);
  const jsonPreview = useMemo(() => previewJsonBackup(json), [json]);

  async function importRows(rows: CsvPreviewRow[], onDone?: () => void): Promise<void> {
    setImporting(true);
    try {
      const existing = await listCards();
      let imported = 0;
      let skipped = 0;
      for (const row of rows) {
        if (hasDuplicate(existing, row.term, row.meaning_ja)) {
          skipped += 1;
          continue;
        }
        const deck = await findOrCreateDeck(row.deck);
        const card = await createCard({
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
        existing.push(card);
        imported += 1;
      }
      setSkippedDuplicates(skipped);
      Alert.alert("インポート完了", buildImportMessage(imported, skipped));
      onDone?.();
    } finally {
      setImporting(false);
    }
  }

  async function importCsvRows(rows: CsvPreviewRow[]): Promise<void> {
    await importRows(rows, () => setCsv(""));
  }

  async function importExcelRows(rows: CsvPreviewRow[]): Promise<void> {
    await importRows(rows, () => {
      setExcelPreview(null);
      setExcelFileName("");
    });
  }

  async function exportCsv(): Promise<void> {
    setExporting(true);
    try {
      const cards = await listCards({ archived: false });
      await shareText(cardsToCsv(cards), "kotoba-pocket-cards.csv", "text/csv;charset=utf-8");
      Alert.alert("CSVを書き出しました", `${cards.length}件の単語カードを出力しました。`);
    } finally {
      setExporting(false);
    }
  }

  async function pickExcelFile(): Promise<void> {
    try {
      const result = await pickExcelData();
      if (!result) return;
      setExcelFileName(result.name);
      setExcelPreview(previewExcel(result.data, result.type));
    } catch (error) {
      Alert.alert("Excelを読み込めませんでした", error instanceof Error ? error.message : "ファイルを確認してください。");
    }
  }

  async function exportExcel(): Promise<void> {
    setExporting(true);
    try {
      const cards = await listCards({ archived: false });
      await shareExcel(cards, "kotoba-pocket-cards.xlsx");
      Alert.alert("Excelを書き出しました", `${cards.length}件の単語カードを出力しました。`);
    } finally {
      setExporting(false);
    }
  }

  async function exportExcelTemplate(): Promise<void> {
    const array = createExcelTemplateArray();
    await saveExcelArrayWeb(array, "kotoba-pocket-import-template.xlsx");
  }

  async function exportJson(): Promise<void> {
    setExporting(true);
    try {
      const cards = await listCards();
      const payload = JSON.stringify({ exported_at: new Date().toISOString(), cards }, null, 2);
      await shareText(payload, "kotoba-pocket-backup.json", "application/json;charset=utf-8");
      Alert.alert("JSONを書き出しました", `${cards.length}件の単語カードを含むバックアップを出力しました。`);
    } finally {
      setExporting(false);
    }
  }

  async function importJsonBackup(cards: Card[]): Promise<void> {
    setImporting(true);
    try {
      const existing = await listCards();
      const deck = await findOrCreateDeck("Imported");
      let imported = 0;
      let skipped = 0;
      for (const card of cards) {
        if (hasDuplicate(existing, card.term, card.meaning_ja)) {
          skipped += 1;
          continue;
        }
        const created = await createCard({
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
        existing.push(created);
        imported += 1;
      }
      setSkippedDuplicates(skipped);
      Alert.alert("JSON復元完了", buildImportMessage(imported, skipped));
      setJson("");
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>データ</Text>
        <Text style={styles.subtitle}>
          ログイン同期を使わなくても、CSVとJSONでローカルデータを持ち出せます。
        </Text>
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
              <ErrorBanner key={`${error.row}-${error.message}`} title={`行${error.row}を確認してください`} message={error.message} />
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

      <Section title="Excelインポート">
        <Text style={styles.helper}>
          `.xlsx` ファイルを選ぶと、CSVと同じ列構成でプレビューしてから追加できます。
        </Text>
        {Platform.OS === "web" ? (
          <AppButton label="Excelサンプルをダウンロード" variant="secondary" onPress={() => void exportExcelTemplate()} />
        ) : null}
        <AppButton label="Excelファイルを選択" variant="secondary" onPress={() => void pickExcelFile()} />
        {excelPreview ? (
          <View style={styles.reportBox}>
            <Text style={styles.report}>{excelFileName || "Excelファイル"}</Text>
            <Text style={styles.report}>有効: {excelPreview.validRows.length}件 / エラー: {excelPreview.errors.length}件</Text>
            {excelPreview.validRows.slice(0, 3).map((row, index) => (
              <Text key={`${row.term}-${index}`} style={styles.previewText}>・{row.term} - {row.meaning_ja}</Text>
            ))}
            {excelPreview.errors.slice(0, 3).map(error => (
              <ErrorBanner key={`${error.row}-${error.message}`} title={`行${error.row}を確認してください`} message={error.message} />
            ))}
          </View>
        ) : null}
        <AppButton
          label="プレビューしたExcelを追加"
          loading={importing}
          disabled={!excelPreview || excelPreview.validRows.length === 0}
          onPress={() => excelPreview ? void importExcelRows(excelPreview.validRows) : undefined}
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
            {jsonPreview.error ? <ErrorBanner title="JSONを確認してください" message={jsonPreview.error} /> : null}
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

      {skippedDuplicates > 0 ? (
        <Text style={styles.helper}>直近のインポートで、重複している{skippedDuplicates}件をスキップしました。</Text>
      ) : null}

      <Section title="エクスポート">
        <AppButton label="CSVを書き出し" variant="secondary" loading={exporting} onPress={() => void exportCsv()} />
        <AppButton label="Excelを書き出し" variant="secondary" loading={exporting} onPress={() => void exportExcel()} />
        <AppButton label="JSONバックアップを書き出し" variant="secondary" loading={exporting} onPress={() => void exportJson()} />
        <Text style={styles.helper}>
          Webではファイルをダウンロードします。スマホでは共有シートまたはクリップボードを使います。
        </Text>
      </Section>

      <Section title="ログイン同期">
        <Text style={styles.helper}>
          マジックリンク同期は保留中です。ローカル保存、復習、CSV/JSONバックアップはそのまま利用できます。
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
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

function hasDuplicate(cards: Card[], term: string, meaningJa: string): boolean {
  const normalizedTerm = term.trim().toLowerCase();
  const normalizedMeaning = meaningJa.trim();
  return cards.some(card => card.term.trim().toLowerCase() === normalizedTerm && card.meaning_ja.trim() === normalizedMeaning);
}

function buildImportMessage(imported: number, skipped: number): string {
  const base = `${imported}件の単語カードを追加しました。`;
  return skipped > 0 ? `${base} 重複している${skipped}件はスキップしました。` : base;
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

async function pickExcelData(): Promise<{ name: string; data: ArrayBuffer | string; type: "array" | "base64" } | null> {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return pickExcelDataWeb();
  }
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ],
    copyToCacheDirectory: true
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  return { name: asset.name ?? "import.xlsx", data: base64, type: "base64" };
}

function pickExcelDataWeb(): Promise<{ name: string; data: ArrayBuffer; type: "array" } | null> {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.arrayBuffer()
        .then(data => resolve({ name: file.name, data, type: "array" }))
        .catch(() => resolve(null));
    };
    input.click();
  });
}

async function shareExcel(cards: Card[], fileName: string): Promise<void> {
  if (Platform.OS === "web") {
    await saveExcelArrayWeb(cardsToExcelArray(cards), fileName);
    return;
  }
  const base64 = cardsToExcelBase64(cards);
  const uri = `${FileSystem.cacheDirectory ?? ""}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Excelを書き出し"
    });
    return;
  }
  Alert.alert("共有できません", "この端末ではファイル共有を利用できません。");
}

async function saveExcelArrayWeb(content: ArrayBuffer, fileName: string): Promise<void> {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const blob = new Blob([content], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function previewJsonBackup(input: string): { cards: Card[]; error: string | null } {
  if (!input.trim()) return { cards: [], error: null };
  try {
    const parsed = JSON.parse(input) as { cards?: unknown };
    if (!Array.isArray(parsed.cards)) return { cards: [], error: "cards配列が見つかりません。" };
    const cards = parsed.cards.filter(isImportableCard);
    if (cards.length === 0) return { cards: [], error: "復元できる単語カードがありません。" };
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
  helper: { color: colors.muted, lineHeight: 20 }
});
