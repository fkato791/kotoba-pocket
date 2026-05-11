import type { Card } from "@/domain/models";

export function buildTodayQueue(cards: Card[], nowIso: string): Card[] {
  return cards
    .filter(card => !card.is_archived && !card.deleted_at)
    .filter(card => card.due_at === null || card.due_at <= nowIso || card.lapses > 0)
    .sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return (a.due_at ?? a.created_at).localeCompare(b.due_at ?? b.created_at);
    });
}
