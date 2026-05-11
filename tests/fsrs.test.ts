import { describe, expect, it } from "vitest";
import { scheduleReview } from "../src/features/review/fsrs";

describe("FSRS-compatible scheduler", () => {
  it("schedules first good review into the future", () => {
    const result = scheduleReview({ stability: null, difficulty: null, scheduledDays: 0, lapses: 0 }, "good", "2026-05-10T00:00:00.000Z");
    expect(result.scheduledDays).toBe(3);
    expect(result.dueAt).toBe("2026-05-13T00:00:00.000Z");
  });

  it("increments lapses on again", () => {
    const result = scheduleReview({ stability: 5, difficulty: 5, scheduledDays: 5, lapses: 1 }, "again", "2026-05-10T00:00:00.000Z");
    expect(result.scheduledDays).toBe(0);
    expect(result.lapses).toBe(2);
  });
});
