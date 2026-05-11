const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\s-]?){9,}/;
const secretWords = ["password", "api key", "secret", "住所", "電話番号", "パスワード", "個人情報"];

export function hasSensitiveContent(...values: (string | null | undefined)[]): boolean {
  const text = values.filter(Boolean).join("\n").toLowerCase();
  return emailPattern.test(text) || phonePattern.test(text) || secretWords.some(word => text.includes(word));
}
