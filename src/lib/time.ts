export function nowIso(): string {
  return new Date().toISOString();
}

export function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
