import { getDatabase } from "@/data/local/database";

const cursorKey = "remote_cursor";

export async function getSyncCursor(): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>("SELECT value FROM sync_state WHERE key = ?", cursorKey);
  return row?.value ? String(row.value) : "1970-01-01T00:00:00.000Z";
}

export async function setSyncCursor(cursor: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("INSERT OR REPLACE INTO sync_state (key, value) VALUES (?, ?)", cursorKey, cursor);
}
