import { getDatabase } from "@/data/local/database";
import { mapCard } from "@/data/local/rowMappers";
import { enqueueChange } from "@/data/local/syncQueueRepository";
import type { Card, ReviewLog, ReviewMode, ReviewRating, TermType } from "@/domain/models";
import type { QuickAddCardInput } from "@/domain/schemas";
import { scheduleReview } from "@/features/review/fsrs";
import { createId } from "@/lib/ids";
import { nowIso } from "@/lib/time";

const LOCAL_USER_ID = "local-user";

export interface CardFilters {
  q?: string;
  deck_id?: string;
  tag?: string;
  due_before?: string;
  difficult?: boolean;
  archived?: boolean;
  term_type?: TermType;
}

export async function createCard(input: QuickAddCardInput): Promise<Card> {
  const db = await getDatabase();
  const timestamp = nowIso();
  const card: Card = {
    id: createId(),
    user_id: LOCAL_USER_ID,
    deck_id: input.deck_id,
    term: input.term,
    term_type: input.term_type,
    meaning_ja: input.meaning_ja,
    part_of_speech: input.part_of_speech || null,
    ipa: null,
    note: input.note || null,
    source_text: input.source_text || null,
    source_url: input.source_url || null,
    difficulty: 0,
    is_pinned: false,
    is_archived: false,
    due_at: null,
    scheduled_days: 0,
    stability: null,
    fsrs_difficulty: null,
    lapses: 0,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO cards (
        id, user_id, deck_id, term, term_type, meaning_ja, part_of_speech, ipa, note,
        source_text, source_url, difficulty, is_pinned, is_archived, due_at,
        scheduled_days, stability, fsrs_difficulty, lapses, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      card.id,
      card.user_id,
      card.deck_id,
      card.term,
      card.term_type,
      card.meaning_ja,
      card.part_of_speech,
      card.ipa,
      card.note,
      card.source_text,
      card.source_url,
      card.difficulty,
      0,
      0,
      card.due_at,
      card.scheduled_days,
      card.stability,
      card.fsrs_difficulty,
      card.lapses,
      card.created_at,
      card.updated_at
    );
    if (input.example_sentence_en) {
      await db.runAsync(
        "INSERT INTO examples (id, card_id, sentence_en, sentence_ja, is_user_authored, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        createId(),
        card.id,
        input.example_sentence_en,
        input.example_sentence_ja || null,
        1,
        0
      );
    }
  });
  await enqueueChange("card", "upsert", card as unknown as Record<string, unknown>);
  return card;
}

export async function listCards(filters: CardFilters = {}): Promise<Card[]> {
  const db = await getDatabase();
  const clauses = ["deleted_at IS NULL"];
  const args: (string | number)[] = [];
  if (filters.archived !== undefined) {
    clauses.push("is_archived = ?");
    args.push(filters.archived ? 1 : 0);
  }
  if (filters.deck_id) {
    clauses.push("deck_id = ?");
    args.push(filters.deck_id);
  }
  if (filters.term_type) {
    clauses.push("term_type = ?");
    args.push(filters.term_type);
  }
  if (filters.tag) {
    clauses.push(`EXISTS (
      SELECT 1 FROM card_tags ct
      JOIN tags t ON t.id = ct.tag_id
      WHERE ct.card_id = cards.id AND t.name = ?
    )`);
    args.push(filters.tag);
  }
  if (filters.difficult) {
    clauses.push("(difficulty >= 3 OR is_pinned = 1 OR lapses > 0)");
  }
  if (filters.due_before) {
    clauses.push("(due_at IS NULL OR due_at <= ?)");
    args.push(filters.due_before);
  }
  if (filters.q) {
    clauses.push("(term LIKE ? OR meaning_ja LIKE ? OR note LIKE ?)");
    const q = `%${filters.q}%`;
    args.push(q, q, q);
  }
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM cards WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC`,
    ...args
  );
  return rows.map(mapCard);
}

export async function getCard(id: string): Promise<Card | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM cards WHERE id = ?", id);
  return row ? mapCard(row) : null;
}

export async function updateCard(id: string, patch: Partial<Card>): Promise<Card> {
  const current = await getCard(id);
  if (!current) throw new Error("Card not found");
  const next = { ...current, ...patch, updated_at: nowIso() };
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE cards SET term = ?, term_type = ?, meaning_ja = ?, part_of_speech = ?, ipa = ?, note = ?,
      source_text = ?, source_url = ?, difficulty = ?, is_pinned = ?, is_archived = ?, due_at = ?,
      scheduled_days = ?, stability = ?, fsrs_difficulty = ?, lapses = ?, updated_at = ?, deleted_at = ?
      WHERE id = ?`,
    next.term,
    next.term_type,
    next.meaning_ja,
    next.part_of_speech,
    next.ipa,
    next.note,
    next.source_text,
    next.source_url,
    next.difficulty,
    next.is_pinned ? 1 : 0,
    next.is_archived ? 1 : 0,
    next.due_at,
    next.scheduled_days,
    next.stability,
    next.fsrs_difficulty,
    next.lapses,
    next.updated_at,
    next.deleted_at,
    id
  );
  await enqueueChange("card", "upsert", next as unknown as Record<string, unknown>);
  return next;
}

export async function recordReview(card: Card, mode: ReviewMode, rating: ReviewRating, elapsedMs: number): Promise<ReviewLog> {
  const reviewedAt = nowIso();
  const scheduled = scheduleReview(
    {
      stability: card.stability,
      difficulty: card.fsrs_difficulty,
      scheduledDays: card.scheduled_days,
      lapses: card.lapses
    },
    rating,
    reviewedAt
  );
  const log: ReviewLog = {
    id: createId(),
    user_id: card.user_id,
    card_id: card.id,
    mode,
    rating,
    elapsed_ms: elapsedMs,
    reviewed_at: reviewedAt,
    scheduled_days: scheduled.scheduledDays,
    stability_snapshot: scheduled.stability,
    difficulty_snapshot: scheduled.difficulty
  };
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE cards SET due_at = ?, scheduled_days = ?, stability = ?, fsrs_difficulty = ?,
        lapses = ?, difficulty = ?, updated_at = ? WHERE id = ?`,
      scheduled.dueAt,
      scheduled.scheduledDays,
      scheduled.stability,
      scheduled.difficulty,
      scheduled.lapses,
      rating === "again" ? card.difficulty + 1 : card.difficulty,
      reviewedAt,
      card.id
    );
    await db.runAsync(
      `INSERT INTO review_logs (
        id, user_id, card_id, mode, rating, elapsed_ms, reviewed_at, scheduled_days,
        stability_snapshot, difficulty_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      log.id,
      log.user_id,
      log.card_id,
      log.mode,
      log.rating,
      log.elapsed_ms,
      log.reviewed_at,
      log.scheduled_days,
      log.stability_snapshot,
      log.difficulty_snapshot
    );
  });
  await enqueueChange("review_log", "upsert", log as unknown as Record<string, unknown>);
  return log;
}
