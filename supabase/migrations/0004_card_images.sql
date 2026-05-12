alter table public.cards
  add column if not exists term_image_uri text,
  add column if not exists meaning_image_uri text;
