-- Storage bucket for uploaded profile photos (set from /me). Public read so
-- next/image and <img> tags can load them directly; writes only via the
-- service role, which the /api/users/[id]/avatar route uses after checking
-- the request's bearer token against that same user.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');
