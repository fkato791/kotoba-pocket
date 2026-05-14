export type ReviewPace = "focused" | "standard" | "relaxed";

const reviewPaceKey = "kotoba-pocket-review-pace";

const paceMultipliers: Record<ReviewPace, number> = {
  focused: 0.65,
  standard: 1,
  relaxed: 1.55
};

let currentReviewPace: ReviewPace = getInitialReviewPace();

export function getReviewPaceMultiplier(): number {
  return paceMultipliers[currentReviewPace];
}

export function getCurrentReviewPace(): ReviewPace {
  return currentReviewPace;
}

export async function loadReviewPace(): Promise<ReviewPace> {
  const stored = await readStoredReviewPace();
  currentReviewPace = stored;
  return stored;
}

export async function setReviewPace(pace: ReviewPace): Promise<void> {
  currentReviewPace = pace;
  if (isWebRuntime()) {
    window.localStorage.setItem(reviewPaceKey, pace);
    return;
  }
  await getAsyncStorage().setItem(reviewPaceKey, pace).catch(() => undefined);
}

function getInitialReviewPace(): ReviewPace {
  if (isWebRuntime()) {
    const stored = window.localStorage.getItem(reviewPaceKey);
    if (isReviewPace(stored)) return stored;
  }
  return "standard";
}

async function readStoredReviewPace(): Promise<ReviewPace> {
  if (isWebRuntime()) return getInitialReviewPace();
  const stored = await getAsyncStorage().getItem(reviewPaceKey).catch(() => null);
  return isReviewPace(stored) ? stored : "standard";
}

function isWebRuntime(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

interface MinimalAsyncStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}

function getAsyncStorage(): MinimalAsyncStorage {
  const load = eval("require") as (name: string) => { default?: MinimalAsyncStorage } & Partial<MinimalAsyncStorage>;
  const mod = load("@react-native-async-storage/async-storage");
  return mod.default ?? (mod as MinimalAsyncStorage);
}

function isReviewPace(value: unknown): value is ReviewPace {
  return value === "focused" || value === "standard" || value === "relaxed";
}
