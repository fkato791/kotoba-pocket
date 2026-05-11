export type UUID = string;
export type ISODateString = string;

export type Platform = "ios" | "android";
export type TermType = "word" | "idiom" | "phrase" | "phrasal_verb" | "collocation";
export type ReviewMode = "flashcard" | "mcq" | "cloze" | "typing";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ShareVisibility = "read_only";

export interface User {
  id: UUID;
  email: string | null;
  locale: string;
  created_at: ISODateString;
  deleted_at: ISODateString | null;
}

export interface Device {
  id: UUID;
  user_id: UUID;
  platform: Platform;
  app_version: string;
  created_at: ISODateString;
  last_seen_at: ISODateString;
}

export interface Deck {
  id: UUID;
  user_id: UUID;
  name: string;
  folder: string | null;
  color: string | null;
  is_private: boolean;
  sort_order: number;
  created_at: ISODateString;
  updated_at: ISODateString;
  deleted_at: ISODateString | null;
}

export interface Tag {
  id: UUID;
  user_id: UUID;
  name: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Card {
  id: UUID;
  user_id: UUID;
  deck_id: UUID;
  term: string;
  term_type: TermType;
  meaning_ja: string;
  part_of_speech: string | null;
  ipa: string | null;
  note: string | null;
  source_text: string | null;
  source_url: string | null;
  difficulty: number;
  is_pinned: boolean;
  is_archived: boolean;
  due_at: ISODateString | null;
  scheduled_days: number;
  stability: number | null;
  fsrs_difficulty: number | null;
  lapses: number;
  created_at: ISODateString;
  updated_at: ISODateString;
  deleted_at: ISODateString | null;
}

export interface CardTag {
  card_id: UUID;
  tag_id: UUID;
}

export interface Example {
  id: UUID;
  card_id: UUID;
  sentence_en: string;
  sentence_ja: string | null;
  is_user_authored: boolean;
  sort_order: number;
}

export interface PronunciationAsset {
  id: UUID;
  card_id: UUID;
  provider: string;
  audio_uri: string;
  created_at: ISODateString;
}

export interface ReviewLog {
  id: UUID;
  user_id: UUID;
  card_id: UUID;
  mode: ReviewMode;
  rating: ReviewRating;
  elapsed_ms: number;
  reviewed_at: ISODateString;
  scheduled_days: number;
  stability_snapshot: number | null;
  difficulty_snapshot: number | null;
}

export interface ShareLink {
  id: UUID;
  user_id: UUID;
  deck_id: UUID;
  token: string;
  visibility: ShareVisibility;
  expires_at: ISODateString | null;
  created_at: ISODateString;
  revoked_at: ISODateString | null;
}
