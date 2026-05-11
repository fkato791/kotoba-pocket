import { z } from "zod";

export const termTypeSchema = z.enum(["word", "idiom", "phrase", "phrasal_verb", "collocation"]);

export const quickAddCardSchema = z.object({
  term: z.string().trim().min(1, "英語を入力してください").max(180),
  meaning_ja: z.string().trim().min(1, "意味を入力してください").max(1000),
  term_type: termTypeSchema.default("word"),
  part_of_speech: z.string().trim().max(80).optional(),
  example_sentence_en: z.string().trim().max(1000).optional(),
  example_sentence_ja: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(2000).optional(),
  source_text: z.string().trim().max(2000).optional(),
  source_url: z.string().trim().url().optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1)).default([]),
  deck_id: z.string().uuid()
});

export type QuickAddCardInput = z.infer<typeof quickAddCardSchema>;
