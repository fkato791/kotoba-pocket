import Papa from "papaparse";
import { z } from "zod";
import type { Card } from "@/domain/models";

export const csvRowSchema = z.object({
  term: z.string().trim().min(1, "英語が空です"),
  meaning_ja: z.string().trim().min(1, "意味が空です"),
  term_type: z.enum(["word", "idiom", "phrase", "phrasal_verb", "collocation"]).default("word"),
  part_of_speech: z.string().optional(),
  example_sentence_en: z.string().optional(),
  example_sentence_ja: z.string().optional(),
  note: z.string().optional(),
  source_text: z.string().optional(),
  source_url: z.string().optional(),
  tags: z.string().optional(),
  deck: z.string().optional()
});

export type CsvPreviewRow = z.infer<typeof csvRowSchema>;

export interface CsvPreview {
  validRows: CsvPreviewRow[];
  errors: { row: number; message: string }[];
}

export const csvTemplate = [
  "term,meaning_ja,term_type,part_of_speech,example_sentence_en,example_sentence_ja,note,source_text,source_url,tags,deck",
  "take it for granted,当然だと思う,idiom,verb,Don't take your health for granted.,健康を当然だと思わないでください。,TOEICで重要,YouTube,,TOEIC;daily,Inbox"
].join("\n");

export function previewCsv(csv: string): CsvPreview {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const validRows: CsvPreviewRow[] = [];
  const errors: { row: number; message: string }[] = [];
  if (parsed.errors.length > 0) {
    errors.push(...parsed.errors.map(error => ({ row: (error.row ?? 0) + 2, message: error.message })));
  }
  parsed.data.forEach((row, index) => {
    const normalized = normalizeCsvRow(row);
    const result = csvRowSchema.safeParse(normalized);
    if (result.success) validRows.push(result.data);
    else errors.push({ row: index + 2, message: result.error.issues[0]?.message ?? "行を確認してください" });
  });
  return { validRows, errors };
}

export function cardsToCsv(cards: Card[]): string {
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
  return Papa.unparse(rows, {
    columns: ["term", "meaning_ja", "term_type", "part_of_speech", "example_sentence_en", "example_sentence_ja", "note", "source_text", "source_url", "tags", "deck"]
  });
}

function normalizeCsvRow(row: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim(), typeof value === "string" ? value.trim() : value]));
}
