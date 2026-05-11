import { isAnswerMatch } from "@/lib/text/normalizeAnswer";

export function checkTypingRecall(expected: string, actual: string): boolean {
  return isAnswerMatch(expected, actual, { punctuationInsensitive: true });
}

export function makeClozePrompt(sentence: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp(escaped, "i"), "_____");
}
