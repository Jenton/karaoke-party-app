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
drop policy if exists "songs are readable by everyone" on public.songs;
create policy "songs are readable by everyone"
  on public.songs for select using (true);

-- ...but only a signed-in grown-up can add, rename or remove songs.
drop policy if exists "signed-in users can insert" on public.songs;
create policy "signed-in users can insert"
  on public.songs for insert to authenticated with check (true);
drop policy if exists "signed-in users can update" on public.songs;
create policy "signed-in users can update"
  on public.songs for update to authenticated using (true) with check (true);
drop policy if exists "signed-in users can delete" on public.songs;
create policy "signed-in users can delete"
  on public.songs for delete to authenticated using (true);

-- Already ran an older version of this file? Add the artist column with:
--   alter table public.songs add column if not exists artist text;
--   alter table public.songs add column if not exists genre text;
--   alter table public.songs add column if not exists karaoke_id text;
--   alter table public.songs add column if not exists official_id text;

-- Shared party queue (so the laptop, the TV and phones on the public page all see the same queue).
-- One row. Everyone may read and write it: it only holds the song queue, no personal data.
create table if not exists public.party_state (
  id         text primary key,
  state      jsonb not null default '{}'::jsonb,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.party_state enable row level security;

drop policy if exists "queue is readable by everyone" on public.party_state;
create policy "queue is readable by everyone"
  on public.party_state for select using (true);
drop policy if exists "queue can be added to by everyone" on public.party_state;
create policy "queue can be added to by everyone"
  on public.party_state for insert with check (id = 'main');
drop policy if exists "queue can be changed by everyone" on public.party_state;
create policy "queue can be changed by everyone"
  on public.party_state for update using (id = 'main') with check (id = 'main');

-- bump the revision on every change so every device can tell when something is new
create or replace function public.party_state_bump() returns trigger as $$
begin
  new.rev := coalesce(old.rev, 0) + 1;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists party_state_bump on public.party_state;
create trigger party_state_bump before insert or update on public.party_state
  for each row execute function public.party_state_bump();
