import { describe, expect, it } from "vitest";
import { cardsToExcelArray, previewExcel } from "../src/features/importExport/excel";
import type { Card } from "../src/domain/models";

describe("Excel import/export", () => {
  it("exports cards and previews the workbook", () => {
    const cards: Card[] = [
      {
        id: "card-1",
        user_id: "user-1",
        deck_id: "Inbox",
        term: "meticulous",
        term_type: "word",
        meaning_ja: "注意深い",
        term_image_uri: null,
        meaning_image_uri: null,
        part_of_speech: "adjective",
        ipa: null,
        note: "formal",
        source_text: null,
        source_url: null,
        difficulty: 0,
        is_pinned: false,
        is_archived: false,
        due_at: null,
        scheduled_days: 0,
        stability: null,
        fsrs_difficulty: null,
        lapses: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null
      }
    ];

    const workbook = cardsToExcelArray(cards);
    const preview = previewExcel(workbook, "array");

    expect(preview.errors).toHaveLength(0);
    expect(preview.validRows[0]?.term).toBe("meticulous");
    expect(preview.validRows[0]?.meaning_ja).toBe("注意深い");
  });
});
