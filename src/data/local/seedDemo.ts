import { ensureDefaultDeck } from "@/data/repositories/deckRepository";
import { createCard, listCards } from "@/data/repositories/cardRepository";

export async function seedDemoContent(): Promise<void> {
  const existing = await listCards();
  if (existing.length > 0) return;
  const deck = await ensureDefaultDeck();
  await createCard({
    deck_id: deck.id,
    term: "take it for granted",
    meaning_ja: "当然だと思う",
    term_type: "idiom",
    auto_pronunciation: true,
    part_of_speech: "phrase",
    example_sentence_en: "Do not take your friends for granted.",
    example_sentence_ja: "友達を当たり前だと思わないで。",
    note: "日常会話でよく出る表現",
    source_text: "class",
    source_url: "",
    tags: ["daily"]
  });
}
