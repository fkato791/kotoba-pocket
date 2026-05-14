import { addDaysIso } from "@/lib/time";
import type { ReviewRating } from "@/domain/models";
import { getReviewPaceMultiplier } from "@/features/review/reviewPreferences";

export interface FsrsState {
  stability: number | null;
  difficulty: number | null;
  scheduledDays: number;
  lapses: number;
}

export interface FsrsResult extends FsrsState {
  dueAt: string;
}

const ratingScore: Record<ReviewRating, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 4
};

export function scheduleReview(state: FsrsState, rating: ReviewRating, reviewedAtIso: string): FsrsResult {
  const score = ratingScore[rating];
  const previousStability = state.stability ?? 0;
  const previousDifficulty = state.difficulty ?? 5;
  const firstReview = previousStability <= 0;

  const difficulty = clamp(previousDifficulty + (3 - score) * 0.7, 1, 10);
  const stability = firstReview
    ? initialStability(score)
    : nextStability(previousStability, difficulty, score);
  const scheduledDays = rating === "again" ? 0 : Math.max(1, Math.round(stability * getReviewPaceMultiplier()));

  return {
    stability,
    difficulty,
    scheduledDays,
    lapses: rating === "again" ? state.lapses + 1 : state.lapses,
    dueAt: addDaysIso(reviewedAtIso, scheduledDays)
  };
}

function initialStability(score: number): number {
  if (score === 1) return 0;
  if (score === 2) return 1;
  if (score === 3) return 3;
  return 5;
}

function nextStability(stability: number, difficulty: number, score: number): number {
  if (score === 1) return 0;
  const easeMultiplier = score === 2 ? 1.2 : score === 3 ? 2.2 : 3.4;
  const difficultyDrag = 1 - (difficulty - 5) * 0.04;
  return clamp(stability * easeMultiplier * difficultyDrag, 1, 3650);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
