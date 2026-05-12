import { describe, expect, it } from "vitest";
import type { Card } from "../src/domain/models";
import { buildTodayQueue } from "../src/features/review/reviewQueue";

const baseCard: Card = {
  id: "1",
  user_id: "u",
  deck_id: "d",
  term: "meticulous",
  term_type: "word",
  meaning_ja: "注意深い",
  term_image_uri: null,
  meaning_image_uri: null,
  part_of_speech: null,
  ipa: null,
  note: null,
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
  created_at: "2026-05-09T00:00:00.000Z",
  updated_at: "2026-05-09T00:00:00.000Z",
  deleted_at: null
};

describe("review queue filters", () => {
  it("includes new cards and excludes archived cards", () => {
    const queue = buildTodayQueue([
      baseCard,
      { ...baseCard, id: "2", is_archived: true }
    ], "2026-05-10T00:00:00.000Z");
    expect(queue.map(card => card.id)).toEqual(["1"]);
  });
});
