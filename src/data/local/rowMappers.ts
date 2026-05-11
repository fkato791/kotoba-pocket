import type { Card, Deck } from "@/domain/models";

export function mapDeck(row: Record<string, unknown>): Deck {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    folder: nullableString(row.folder),
    color: nullableString(row.color),
    is_private: Boolean(row.is_private),
    sort_order: Number(row.sort_order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: nullableString(row.deleted_at)
  };
}

export function mapCard(row: Record<string, unknown>): Card {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    deck_id: String(row.deck_id),
    term: String(row.term),
    term_type: row.term_type as Card["term_type"],
    meaning_ja: String(row.meaning_ja),
    part_of_speech: nullableString(row.part_of_speech),
    ipa: nullableString(row.ipa),
    note: nullableString(row.note),
    source_text: nullableString(row.source_text),
    source_url: nullableString(row.source_url),
    difficulty: Number(row.difficulty),
    is_pinned: Boolean(row.is_pinned),
    is_archived: Boolean(row.is_archived),
    due_at: nullableString(row.due_at),
    scheduled_days: Number(row.scheduled_days),
    stability: nullableNumber(row.stability),
    fsrs_difficulty: nullableNumber(row.fsrs_difficulty),
    lapses: Number(row.lapses),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: nullableString(row.deleted_at)
  };
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}
