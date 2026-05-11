create extension if not exists "pgcrypto";

create type app_platform as enum ('ios', 'android');
create type term_type as enum ('word', 'idiom', 'phrase', 'phrasal_verb', 'collocation');
create type review_mode as enum ('flashcard', 'mcq', 'cloze', 'typing');
create type review_rating as enum ('again', 'hard', 'good', 'easy');
create type share_visibility as enum ('read_only');
create type sync_entity as enum ('deck', 'card', 'tag', 'review_log', 'share_link');
create type sync_op as enum ('upsert', 'delete');
create type conflict_resolution as enum ('field_merge', 'last_write_wins');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  locale text not null default 'ja',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.devices (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform app_platform not null,
  app_version text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.decks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  folder text,
  color text,
  is_private boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.tags (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (user_id, name)
);

create table public.cards (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  term text not null,
  term_type term_type not null default 'word',
  meaning_ja text not null,
  part_of_speech text,
  ipa text,
  note text,
  source_text text,
  source_url text,
  difficulty integer not null default 0,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  due_at timestamptz,
  scheduled_days integer not null default 0,
  stability double precision,
  fsrs_difficulty double precision,
  lapses integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz
);

create table public.card_tags (
  card_id uuid not null references public.cards(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (card_id, tag_id)
);

create table public.examples (
  id uuid primary key,
  card_id uuid not null references public.cards(id) on delete cascade,
  sentence_en text not null,
  sentence_ja text,
  is_user_authored boolean not null default true,
  sort_order integer not null default 0
);

create table public.pronunciation_assets (
  id uuid primary key,
  card_id uuid not null references public.cards(id) on delete cascade,
  provider text not null,
  audio_uri text not null,
  created_at timestamptz not null default now()
);

create table public.review_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  mode review_mode not null,
  rating review_rating not null,
  elapsed_ms integer not null,
  reviewed_at timestamptz not null,
  scheduled_days integer not null,
  stability_snapshot double precision,
  difficulty_snapshot double precision
);

create table public.share_links (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  token text not null unique,
  visibility share_visibility not null default 'read_only',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table public.conflict_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity sync_entity not null,
  entity_id uuid not null,
  field text,
  local_value jsonb,
  remote_value jsonb,
  resolution conflict_resolution not null,
  created_at timestamptz not null default now()
);

create index cards_user_due_idx on public.cards(user_id, due_at) where deleted_at is null;
create index cards_user_term_idx on public.cards using gin (to_tsvector('simple', term || ' ' || meaning_ja));
create index review_logs_card_idx on public.review_logs(card_id, reviewed_at desc);
create index share_links_token_idx on public.share_links(token) where revoked_at is null;
