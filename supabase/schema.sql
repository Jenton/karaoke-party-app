-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
create table if not exists public.songs (
  video_id   text primary key,
  title      text not null,
  artist     text,
  genre      text,
  karaoke_id text,
  official_id text,
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;

-- Anyone (the public page, phones) can read the list...
create policy "songs are readable by everyone"
  on public.songs for select using (true);

-- ...but only a signed-in grown-up can add, rename or remove songs.
create policy "signed-in users can insert"
  on public.songs for insert to authenticated with check (true);
create policy "signed-in users can update"
  on public.songs for update to authenticated using (true) with check (true);
create policy "signed-in users can delete"
  on public.songs for delete to authenticated using (true);

-- Already ran an older version of this file? Add the artist column with:
--   alter table public.songs add column if not exists artist text;
--   alter table public.songs add column if not exists genre text;
--   alter table public.songs add column if not exists karaoke_id text;
--   alter table public.songs add column if not exists official_id text;
