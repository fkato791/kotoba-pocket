alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.decks enable row level security;
alter table public.tags enable row level security;
alter table public.cards enable row level security;
alter table public.card_tags enable row level security;
alter table public.examples enable row level security;
alter table public.pronunciation_assets enable row level security;
alter table public.review_logs enable row level security;
alter table public.share_links enable row level security;
alter table public.conflict_logs enable row level security;

create policy "profiles own rows" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "devices own rows" on public.devices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "decks own rows" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags own rows" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cards own rows" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "card tags through owned cards" on public.card_tags
  for all using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

create policy "examples through owned cards" on public.examples
  for all using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

create policy "audio through owned cards" on public.pronunciation_assets
  for all using (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid())
  );

create policy "review logs own rows" on public.review_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "share links own rows" on public.share_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public read active share links" on public.share_links
  for select using (
    revoked_at is null and (expires_at is null or expires_at > now())
  );

create policy "conflict logs own rows" on public.conflict_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
