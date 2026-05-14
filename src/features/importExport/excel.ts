import * as XLSX from "xlsx";
import type { Card } from "@/domain/models";
import { csvRowSchema, type CsvPreview, type CsvPreviewRow } from "@/features/importExport/csv";

export const excelColumns = [
  "term",
  "meaning_ja",
  "term_type",
  "part_of_speech",
  "example_sentence_en",
  "example_sentence_ja",
  "note",
  "source_text",
  "source_url",
  "tags",
  "deck"
] as const;

export function previewExcel(data: ArrayBuffer | string, type: "array" | "base64"): CsvPreview {
  const workbook = XLSX.read(data, { type });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { validRows: [], errors: [{ row: 1, message: "シートが見つかりません。" }] };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { validRows: [], errors: [{ row: 1, message: "シートを読み込めません。" }] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return previewExcelRows(rows);
}

export function cardsToExcelArray(cards: Card[]): ArrayBuffer {
  const workbook = createCardsWorkbook(cards);
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export function cardsToExcelBase64(cards: Card[]): string {
  const workbook = createCardsWorkbook(cards);
  return XLSX.write(workbook, { bookType: "xlsx", type: "base64" }) as string;
}

export function createExcelTemplateArray(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(
    [
      {
        term: "take it for granted",
        meaning_ja: "当然だと思う",
        term_type: "idiom",
        part_of_speech: "verb",
        example_sentence_en: "Don't take your health for granted.",
        example_sentence_ja: "健康を当然だと思わないでください。",
        note: "TOEICで重要",
        source_text: "YouTube",
        source_url: "",
        tags: "TOEIC;daily",
        deck: "Inbox"
      }
    ],
    { header: [...excelColumns] }
  );
  XLSX.utils.book_append_sheet(workbook, sheet, "cards");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function createCardsWorkbook(cards: Card[]): XLSX.WorkBook {
  const rows = cards.map(card => ({
    term: card.term,
    meaning_ja: card.meaning_ja,
    term_type: card.term_type,
    part_of_speech: card.part_of_speech ?? "",
    example_sentence_en: "",
    example_sentence_ja: "",
    note: card.note ?? "",
    source_text: card.source_text ?? "",
    source_url: card.source_url ?? "",
    tags: "",
    deck: card.deck_id
  }));
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...excelColumns] });
  XLSX.utils.book_append_sheet(workbook, sheet, "cards");
  return workbook;
}

function previewExcelRows(rows: Record<string, unknown>[]): CsvPreview {
  const validRows: CsvPreviewRow[] = [];
  const errors: { row: number; message: string }[] = [];
  rows.forEach((row, index) => {
    const normalized = normalizeExcelRow(row);
    const result = csvRowSchema.safeParse(normalized);
    if (result.success) validRows.push(result.data);
    else errors.push({ row: index + 2, message: result.error.issues[0]?.message ?? "行を確認してください" });
  });
  return { validRows, errors };
}

function normalizeExcelRow(row: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim(), value === null || value === undefined ? "" : String(value).trim()])
  );
}
