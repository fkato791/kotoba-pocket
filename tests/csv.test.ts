import { describe, expect, it } from "vitest";
import { previewCsv } from "../src/features/importExport/csv";

describe("CSV import preview", () => {
  it("validates rows and reports invalid rows", () => {
    const preview = previewCsv("term,meaning_ja,term_type\nmeticulous,注意深い,word\n,nope,word");
    expect(preview.validRows).toHaveLength(1);
    expect(preview.errors).toHaveLength(1);
    expect(preview.errors[0]?.row).toBe(3);
  });
});
