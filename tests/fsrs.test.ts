import { describe, expect, it } from "vitest";
import { scheduleReview } from "../src/features/review/fsrs";
import { setReviewPace } from "../src/features/review/reviewPreferences";

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

  it("lets users choose shorter or longer review intervals", async () => {
    await setReviewPace("focused");
    const focused = scheduleReview({ stability: 10, difficulty: 5, scheduledDays: 10, lapses: 0 }, "good", "2026-05-10T00:00:00.000Z");

    await setReviewPace("relaxed");
    const relaxed = scheduleReview({ stability: 10, difficulty: 5, scheduledDays: 10, lapses: 0 }, "good", "2026-05-10T00:00:00.000Z");

    await setReviewPace("standard");

    expect(focused.scheduledDays).toBeLessThan(relaxed.scheduledDays);
  });
});
