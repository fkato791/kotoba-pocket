import { getDatabase } from "@/data/local/database";
import { mapDeck } from "@/data/local/rowMappers";
import { enqueueChange } from "@/data/local/syncQueueRepository";
import type { Deck } from "@/domain/models";
import { createId } from "@/lib/ids";
import { nowIso } from "@/lib/time";

const LOCAL_USER_ID = "local-user";

export async function ensureDefaultDeck(): Promise<Deck> {
  const existing = await listDecks();
  if (existing[0]) return existing[0];
  return createDeck({ name: "Inbox", folder: null, color: "#2563EB" });
}

export async function findOrCreateDeck(name?: string | null): Promise<Deck> {
  const normalized = name?.trim();
  if (!normalized) return ensureDefaultDeck();
  const decks = await listDecks();
  const existing = decks.find(deck => deck.name.toLowerCase() === normalized.toLowerCase());
  if (existing) return existing;
  return createDeck({ name: normalized, folder: null, color: "#2563EB" });
}

export async function listDecks(options: { includeDeleted?: boolean } = {}): Promise<Deck[]> {
  const db = await getDatabase();
  const deletedClause = options.includeDeleted ? "" : "WHERE deleted_at IS NULL";
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM decks ${deletedClause} ORDER BY sort_order ASC, updated_at DESC`
  );
  return rows.map(mapDeck);
}

export async function createDeck(input: Pick<Deck, "name" | "folder" | "color">): Promise<Deck> {
  const db = await getDatabase();
  const timestamp = nowIso();
  const deck: Deck = {
    id: createId(),
    user_id: LOCAL_USER_ID,
    name: input.name,
    folder: input.folder,
    color: input.color,
    is_private: true,
    sort_order: 0,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null
  };
  await db.runAsync(
    "INSERT INTO decks (id, user_id, name, folder, color, is_private, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    deck.id,
    deck.user_id,
    deck.name,
    deck.folder,
    deck.color,
    deck.is_private ? 1 : 0,
    deck.sort_order,
    deck.created_at,
    deck.updated_at
  );
  await enqueueChange("deck", "upsert", deck as unknown as Record<string, unknown>);
  return deck;
}

export async function updateDeck(id: string, patch: Partial<Pick<Deck, "name" | "folder" | "color" | "sort_order" | "deleted_at">>): Promise<Deck> {
  const current = (await listDecks({ includeDeleted: true })).find(deck => deck.id === id);
  if (!current) throw new Error("Deck not found");
  const next: Deck = {
    ...current,
    ...patch,
    updated_at: nowIso()
  };
  const db = await getDatabase();
  await db.runAsync(
    "UPDATE decks SET name = ?, folder = ?, color = ?, is_private = ?, sort_order = ?, updated_at = ?, deleted_at = ? WHERE id = ?",
    next.name,
    next.folder,
    next.color,
    next.is_private ? 1 : 0,
    next.sort_order,
    next.updated_at,
    next.deleted_at,
    id
  );
  await enqueueChange("deck", patch.deleted_at ? "delete" : "upsert", next as unknown as Record<string, unknown>);
  return next;
}

export async function deleteDeck(id: string): Promise<Deck> {
  return updateDeck(id, { deleted_at: nowIso() });
}
