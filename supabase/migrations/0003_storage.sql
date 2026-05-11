insert into storage.buckets (id, name, public)
values ('pronunciation-assets', 'pronunciation-assets', false)
on conflict (id) do nothing;

create policy "audio assets own rows" on storage.objects
  for all using (
    bucket_id = 'pronunciation-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'pronunciation-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
