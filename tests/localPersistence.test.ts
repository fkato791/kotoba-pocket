import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function installWebStorageMock(): void {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {}
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key)
      }
    }
  });
}

describe("web local persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    installWebStorageMock();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "document");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("keeps cards after database reinitialization", async () => {
    const { initializeDatabase, resetDatabaseForTests } = await import("../src/data/local/database");
    const { createCard, listCards } = await import("../src/data/repositories/cardRepository");
    const { ensureDefaultDeck } = await import("../src/data/repositories/deckRepository");

    await initializeDatabase();
    const deck = await ensureDefaultDeck();
    await createCard({
      term: "persist",
      meaning_ja: "保存される",
      term_type: "word",
      deck_id: deck.id,
      auto_pronunciation: false,
      tags: []
    });

    expect((await listCards()).map(card => card.term)).toContain("persist");

    resetDatabaseForTests();
    await initializeDatabase();

    expect((await listCards()).map(card => card.term)).toContain("persist");
  });
});
