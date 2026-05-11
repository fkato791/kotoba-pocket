import { describe, expect, it } from "vitest";
import { mergeEntity } from "../src/features/sync/merge";

describe("sync merge", () => {
  it("field-merges safe fields and records conflicts", () => {
    const result = mergeEntity(
      { id: "1", updated_at: "2026-05-10T00:00:00Z", name: "Local", meaning_ja: "A" },
      { id: "1", updated_at: "2026-05-11T00:00:00Z", name: "Remote", meaning_ja: "B" }
    );
    expect(result.merged.name).toBe("Remote");
    expect(result.merged.meaning_ja).toBe("B");
    expect(result.conflicts.map(conflict => conflict.resolution)).toContain("field_merge");
    expect(result.conflicts.map(conflict => conflict.resolution)).toContain("last_write_wins");
  });
});
