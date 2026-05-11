import { createId } from "@/lib/ids";
import { nowIso } from "@/lib/time";
import { getDatabase } from "@/data/local/database";

export type SyncEntity = "deck" | "card" | "tag" | "review_log" | "share_link";
export type SyncOp = "upsert" | "delete";

export interface QueuedChange {
  id: string;
  entity: SyncEntity;
  op: SyncOp;
  payload: Record<string, unknown>;
  client_updated_at: string;
  attempts: number;
  last_error: string | null;
}

export async function enqueueChange(entity: SyncEntity, op: SyncOp, payload: Record<string, unknown>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT INTO sync_queue (id, entity, op, payload, client_updated_at) VALUES (?, ?, ?, ?, ?)",
    createId(),
    entity,
    op,
    JSON.stringify(payload),
    nowIso()
  );
}

export async function listQueuedChanges(limit = 100): Promise<QueuedChange[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM sync_queue ORDER BY client_updated_at ASC LIMIT ?",
    limit
  );
  return rows.map(row => ({
    id: String(row.id),
    entity: row.entity as SyncEntity,
    op: row.op as SyncOp,
    payload: JSON.parse(String(row.payload)) as Record<string, unknown>,
    client_updated_at: String(row.client_updated_at),
    attempts: Number(row.attempts),
    last_error: row.last_error ? String(row.last_error) : null
  }));
}

export async function removeQueuedChanges(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync("DELETE FROM sync_queue WHERE id = ?", id);
    }
  });
}

export async function markQueuedChangeError(id: string, error: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE sync_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?", error, id);
}
