insert into public.profiles (id, email, locale, created_at)
values ('00000000-0000-0000-0000-000000000001', 'demo@example.jp', 'ja', now())
on conflict do nothing;

insert into public.decks (id, user_id, name, folder, color, is_private, sort_order, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Inbox', null, '#2563EB', true, 0, now(), now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'TOEIC', '試験', '#15803D', true, 1, now(), now())
on conflict do nothing;

insert into public.cards (
  id, user_id, deck_id, term, term_type, meaning_ja, source_text, difficulty,
  is_pinned, is_archived, due_at, scheduled_days, created_at, updated_at
) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'take it for granted', 'idiom', '当然だと思う', 'YouTube', 0, false, false, null, 0, now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'meticulous', 'word', '非常に注意深い', 'TOEIC reading', 1, true, false, now(), 0, now(), now())
on conflict do nothing;
