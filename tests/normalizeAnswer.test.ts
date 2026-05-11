import { describe, expect, it } from "vitest";
import { isAnswerMatch, normalizeAnswer } from "../src/lib/text/normalizeAnswer";

describe("answer normalization", () => {
  it("trims, lowercases, normalizes unicode, and collapses spaces", () => {
    expect(normalizeAnswer("  ＨＥＬＬＯ   World  ")).toBe("hello world");
  });

  it("can ignore punctuation", () => {
    expect(isAnswerMatch("take it for granted", "Take it, for granted!", { punctuationInsensitive: true })).toBe(true);
  });
});
