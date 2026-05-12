import { getDatabase } from "@/data/local/database";
import type { PullResponse } from "@/data/remote/apiClient";
import { mergeEntity, type MergeableEntity } from "@/features/sync/merge";

export interface ApplyRemoteChangesResult {
  applied: number;
  conflicts: number;
}

export async function applyRemoteChanges(response: PullResponse): Promise<ApplyRemoteChangesResult> {
  const db = await getDatabase();
  let applied = 0;
  let conflicts = 0;

  await db.withTransactionAsync(async () => {
    for (const deck of response.changes.decks ?? []) {
      conflicts += await upsertDeck(deck);
      applied += 1;
    }
    for (const card of response.changes.cards ?? []) {
      conflicts += await upsertCard(card);
      applied += 1;
    }
    for (const log of response.changes.review_logs ?? []) {
      await upsertReviewLog(log);
      applied += 1;
    }
  });

  return { applied, conflicts };
}

async function upsertDeck(remote: Record<string, unknown>): Promise<number> {
  const db = await getDatabase();
  const local = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM decks WHERE id = ?", remote.id);
  const next = local ? mergeEntity(local as MergeableEntity, remote as MergeableEntity, "deck") : { merged: remote, conflicts: [] };
  await db.runAsync(
    `INSERT OR REPLACE INTO decks (
      id, user_id, name, folder, color, is_private, sort_order, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    next.merged.id,
    next.merged.user_id,
    next.merged.name,
    nullable(next.merged.folder),
    nullable(next.merged.color),
    boolToInt(next.merged.is_private),
    Number(next.merged.sort_order ?? 0),
    next.merged.created_at,
    next.merged.updated_at,
    nullable(next.merged.deleted_at)
  );
  return next.conflicts.length;
}

async function upsertCard(remote: Record<string, unknown>): Promise<number> {
  const db = await getDatabase();
  const local = await db.getFirstAsync<Record<string, unknown>>("SELECT * FROM cards WHERE id = ?", remote.id);
  const next = local ? mergeEntity(local as MergeableEntity, remote as MergeableEntity, "card") : { merged: remote, conflicts: [] };
  await db.runAsync(
    `INSERT OR REPLACE INTO cards (
      id, user_id, deck_id, term, term_type, meaning_ja, term_image_uri, meaning_image_uri, part_of_speech, ipa, note,
      source_text, source_url, difficulty, is_pinned, is_archived, due_at,
      scheduled_days, stability, fsrs_difficulty, lapses, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    next.merged.id,
    next.merged.user_id,
    next.merged.deck_id,
    next.merged.term,
    next.merged.term_type,
    next.merged.meaning_ja,
    nullable(next.merged.term_image_uri),
    nullable(next.merged.meaning_image_uri),
    nullable(next.merged.part_of_speech),
    nullable(next.merged.ipa),
    nullable(next.merged.note),
    nullable(next.merged.source_text),
    nullable(next.merged.source_url),
    Number(next.merged.difficulty ?? 0),
    boolToInt(next.merged.is_pinned),
    boolToInt(next.merged.is_archived),
    nullable(next.merged.due_at),
    Number(next.merged.scheduled_days ?? 0),
    nullable(next.merged.stability),
    nullable(next.merged.fsrs_difficulty),
    Number(next.merged.lapses ?? 0),
    next.merged.created_at,
    next.merged.updated_at,
    nullable(next.merged.deleted_at)
  );
  return next.conflicts.length;
}

async function upsertReviewLog(remote: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<Record<string, unknown>>("SELECT id FROM review_logs WHERE id = ?", remote.id);
  if (existing) return;
  await db.runAsync(
    `INSERT INTO review_logs (
      id, user_id, card_id, mode, rating, elapsed_ms, reviewed_at, scheduled_days,
      stability_snapshot, difficulty_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    remote.id,
    remote.user_id,
    remote.card_id,
    remote.mode,
    remote.rating,
    Number(remote.elapsed_ms ?? 0),
    remote.reviewed_at,
    Number(remote.scheduled_days ?? 0),
    nullable(remote.stability_snapshot),
    nullable(remote.difficulty_snapshot)
  );
}

function nullable(value: unknown): unknown {
  return value === undefined ? null : value;
}

function boolToInt(value: unknown): number {
  return value === true || value === 1 ? 1 : 0;
}
