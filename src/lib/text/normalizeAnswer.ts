export interface NormalizeOptions {
  punctuationInsensitive?: boolean;
}

const punctuationRegex = /[\p{P}\p{S}]/gu;

export function normalizeAnswer(value: string, options: NormalizeOptions = {}): string {
  const normalized = value.trim().toLocaleLowerCase().normalize("NFKC").replace(/\s+/g, " ");
  return options.punctuationInsensitive ? normalized.replace(punctuationRegex, "").trim() : normalized;
}

export function isAnswerMatch(expected: string, actual: string, options: NormalizeOptions = {}): boolean {
  return normalizeAnswer(expected, options) === normalizeAnswer(actual, options);
}
