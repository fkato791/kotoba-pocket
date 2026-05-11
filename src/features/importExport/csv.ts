import Papa from "papaparse";
import { z } from "zod";

export const csvRowSchema = z.object({
  term: z.string().trim().min(1),
  meaning_ja: z.string().trim().min(1),
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
  "take it for granted,当然だと思う,idiom,verb,,,,YouTube,,TOEIC;daily,Inbox"
].join("\n");

export function previewCsv(csv: string): CsvPreview {
  const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
  const validRows: CsvPreviewRow[] = [];
  const errors: { row: number; message: string }[] = [];
  parsed.data.forEach((row, index) => {
    const result = csvRowSchema.safeParse(row);
    if (result.success) validRows.push(result.data);
    else errors.push({ row: index + 2, message: result.error.issues[0]?.message ?? "Invalid row" });
  });
  return { validRows, errors };
}
