export interface AppDatabase {
  execAsync: (source: string) => Promise<void>;
  runAsync: (source: string, ...params: unknown[]) => Promise<unknown>;
  getAllAsync: <T>(source: string, ...params: unknown[]) => Promise<T[]>;
  getFirstAsync: <T>(source: string, ...params: unknown[]) => Promise<T | null>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
}

let dbPromise: Promise<AppDatabase> | null = null;
const memoryState = {
  decks: [] as Record<string, unknown>[],
  cards: [] as Record<string, unknown>[],
  review_logs: [] as Record<string, unknown>[],
  sync_queue: [] as Record<string, unknown>[]
};
const webStorageKey = "kotoba-pocket-web-db";

export function getDatabase(): Promise<AppDatabase> {
  dbPromise ??= isWebRuntime()
    ? Promise.resolve(createMemoryDatabase())
    : Promise.resolve().then(() => {
        const load = eval("require") as (name: string) => { openDatabaseAsync: (name: string) => Promise<AppDatabase> };
        return load("expo-sqlite").openDatabaseAsync("kotoba-pocket.db");
      });
  return dbPromise;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      folder TEXT,
      color TEXT,
      is_private INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      deck_id TEXT NOT NULL REFERENCES decks(id),
      term TEXT NOT NULL,
      term_type TEXT NOT NULL,
      meaning_ja TEXT NOT NULL,
      term_image_uri TEXT,
      meaning_image_uri TEXT,
      part_of_speech TEXT,
      ipa TEXT,
      note TEXT,
      source_text TEXT,
      source_url TEXT,
      difficulty INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      due_at TEXT,
      scheduled_days INTEGER NOT NULL DEFAULT 0,
      stability REAL,
      fsrs_difficulty REAL,
      lapses INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS card_tags (
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(card_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS examples (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      sentence_en TEXT NOT NULL,
      sentence_ja TEXT,
      is_user_authored INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pronunciation_assets (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      audio_uri TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      mode TEXT NOT NULL,
      rating TEXT NOT NULL,
      elapsed_ms INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL,
      scheduled_days INTEGER NOT NULL,
      stability_snapshot REAL,
      difficulty_snapshot REAL
    );

    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      deck_id TEXT NOT NULL REFERENCES decks(id),
      token TEXT NOT NULL UNIQUE,
      visibility TEXT NOT NULL DEFAULT 'read_only',
      expires_at TEXT,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      op TEXT NOT NULL,
      payload TEXT NOT NULL,
      client_updated_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due_at, is_archived, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_cards_search ON cards(term, meaning_ja);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(client_updated_at);
  `);
  await addColumnIfMissing(db, "cards", "term_image_uri TEXT");
  await addColumnIfMissing(db, "cards", "meaning_image_uri TEXT");
}

async function addColumnIfMissing(db: AppDatabase, table: string, definition: string): Promise<void> {
  try {
    await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  } catch {
    // Existing installs may already have the column; SQLite has limited ADD COLUMN guards.
  }
}

function isWebRuntime(): boolean {
  return typeof document !== "undefined";
}

function createMemoryDatabase(): AppDatabase {
  hydrateMemoryState();
  return {
    async execAsync() {
      return;
    },
    async runAsync(source, ...params) {
      const sql = source.trim().replace(/\s+/g, " ").toLowerCase();
      if (sql.startsWith("insert into decks")) {
        const [
          id,
          user_id,
          name,
          folder,
          color,
          is_private,
          sort_order,
          created_at,
          updated_at
        ] = params;
        upsert(memoryState.decks, {
          id,
          user_id,
          name,
          folder,
          color,
          is_private,
          sort_order,
          created_at,
          updated_at,
          deleted_at: null
        });
        persistMemoryState();
      } else if (sql.startsWith("insert into cards")) {
        const [
          id,
          user_id,
          deck_id,
          term,
          term_type,
          meaning_ja,
          term_image_uri,
          meaning_image_uri,
          part_of_speech,
          ipa,
          note,
          source_text,
          source_url,
          difficulty,
          is_pinned,
          is_archived,
          due_at,
          scheduled_days,
          stability,
          fsrs_difficulty,
          lapses,
          created_at,
          updated_at
        ] = params;
        upsert(memoryState.cards, {
          id,
          user_id,
          deck_id,
          term,
          term_type,
          meaning_ja,
          term_image_uri,
          meaning_image_uri,
          part_of_speech,
          ipa,
          note,
          source_text,
          source_url,
          difficulty,
          is_pinned,
          is_archived,
          due_at,
          scheduled_days,
          stability,
          fsrs_difficulty,
          lapses,
          created_at,
          updated_at,
          deleted_at: null
        });
        persistMemoryState();
      } else if (sql.startsWith("insert into review_logs")) {
        memoryState.review_logs.push(rowFromParams(params));
        persistMemoryState();
      } else if (sql.startsWith("insert into sync_queue")) {
        const [id, entity, op, payload, client_updated_at] = params;
        memoryState.sync_queue.push({ id, entity, op, payload, client_updated_at, attempts: 0, last_error: null });
        persistMemoryState();
      } else if (sql.startsWith("update cards set")) {
        updateCardRow(params);
        persistMemoryState();
      } else if (sql.startsWith("delete from sync_queue")) {
        const [id] = params;
        memoryState.sync_queue = memoryState.sync_queue.filter(row => row.id !== id);
        persistMemoryState();
      }
      return {};
    },
    async getAllAsync<T>(source: string, ...params: unknown[]) {
      const sql = source.trim().replace(/\s+/g, " ").toLowerCase();
      if (sql.includes("from decks")) return sortRows(memoryState.decks) as T[];
      if (sql.includes("from sync_queue")) return [...memoryState.sync_queue] as T[];
      if (sql.includes("from review_logs") && sql.includes("group by")) {
        return aggregateReviewLogs(Number(params[0] ?? 7)) as T[];
      }
      if (sql.includes("from cards")) return filterMemoryCards(params) as T[];
      return [];
    },
    async getFirstAsync<T>(source: string, ...params: unknown[]) {
      const sql = source.trim().replace(/\s+/g, " ").toLowerCase();
      if (sql.includes("from cards")) {
        return (memoryState.cards.find(row => row.id === params[0]) ?? null) as T | null;
      }
      return null;
    },
    async withTransactionAsync(task) {
      await task();
    }
  };
}

function hydrateMemoryState(): void {
  if (!isWebRuntime()) return;
  const stored = window.localStorage.getItem(webStorageKey);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as typeof memoryState;
    memoryState.decks = parsed.decks ?? [];
    memoryState.cards = parsed.cards ?? [];
    memoryState.review_logs = parsed.review_logs ?? [];
    memoryState.sync_queue = parsed.sync_queue ?? [];
  } catch {
    window.localStorage.removeItem(webStorageKey);
  }
}

function persistMemoryState(): void {
  if (!isWebRuntime()) return;
  window.localStorage.setItem(webStorageKey, JSON.stringify(memoryState));
}

function upsert(rows: Record<string, unknown>[], next: Record<string, unknown>): void {
  const index = rows.findIndex(row => row.id === next.id);
  if (index >= 0) rows[index] = { ...rows[index], ...next };
  else rows.push(next);
}

function rowFromParams(params: unknown[]): Record<string, unknown> {
  return Object.fromEntries(params.map((value, index) => [`col_${index}`, value]));
}

function updateCardRow(params: unknown[]): void {
  const id = params.at(-1);
  const row = memoryState.cards.find(card => card.id === id);
  if (!row) return;
  const fields = [
    "term",
    "term_type",
    "meaning_ja",
    "term_image_uri",
    "meaning_image_uri",
    "part_of_speech",
    "ipa",
    "note",
    "source_text",
    "source_url",
    "difficulty",
    "is_pinned",
    "is_archived",
    "due_at",
    "scheduled_days",
    "stability",
    "fsrs_difficulty",
    "lapses",
    "updated_at",
    "deleted_at"
  ];
  fields.forEach((field, index) => {
    row[field] = params[index];
  });
}

function filterMemoryCards(params: unknown[]): Record<string, unknown>[] {
  let rows = memoryState.cards.filter(row => row.deleted_at === null);
  for (const param of params) {
    if (typeof param !== "string") continue;
    if (param.startsWith("%")) {
      const q = param.replaceAll("%", "").toLowerCase();
      rows = rows.filter(row => `${row.term ?? ""} ${row.meaning_ja ?? ""} ${row.note ?? ""}`.toLowerCase().includes(q));
    }
  }
  return sortRows(rows);
}

function sortRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...rows].sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));
}

function aggregateReviewLogs(limit: number): Record<string, unknown>[] {
  const counts = new Map<string, number>();
  for (const row of memoryState.review_logs) {
    const reviewedAt = String(row.reviewed_at ?? row.col_6 ?? "");
    const date = reviewedAt.slice(0, 10);
    if (!date) continue;
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);
}
