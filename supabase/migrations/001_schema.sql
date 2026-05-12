-- ============================================================
-- RLGuesser — Full Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────────────────
-- One row per user, auto-created on sign-up via trigger
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text unique,
  is_pro          boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_streak  int not null default 0,
  longest_streak  int not null default 0,
  last_played_date date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at auto-touch
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── Players ────────────────────────────────────────────────────────────────
create table if not exists public.players (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  position      text,
  nation        text,
  nation_flag   text,           -- emoji e.g. '🏴󠁧󠁢󠁥󠁮󠁧󠁿'
  shirt_number  int,
  photo_path    text,           -- path in Supabase Storage bucket 'player-photos'
  -- clubs is a JSONB array: [{"name":"Leeds Rhinos","years":"2018-23","appearances":134}]
  clubs         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger players_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

-- Full-text search index on player name for fast autocomplete
create index if not exists players_name_idx on public.players
  using gin(to_tsvector('english', name));

-- ── Daily Puzzles ──────────────────────────────────────────────────────────
create table if not exists public.daily_puzzles (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null unique,
  -- Ordered array of exactly 5 player UUIDs
  player_ids  uuid[] not null check (array_length(player_ids, 1) = 5),
  created_at  timestamptz not null default now()
);

create index if not exists daily_puzzles_date_idx on public.daily_puzzles(date);

-- ── Game Sessions ──────────────────────────────────────────────────────────
-- One row per (user × puzzle date). Upserted on every guess.
create table if not exists public.game_sessions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  puzzle_date date not null,
  score       int not null default 0,
  completed   boolean not null default false,
  -- results is a JSONB array mirroring playerResults in the hook:
  -- [{"correct":true,"guessCount":2,"points":800,"playerId":"..."}]
  results     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, puzzle_date)
);

create index if not exists game_sessions_date_idx  on public.game_sessions(puzzle_date);
create index if not exists game_sessions_user_idx  on public.game_sessions(user_id);
create index if not exists game_sessions_score_idx on public.game_sessions(score desc);

create trigger game_sessions_updated_at
  before update on public.game_sessions
  for each row execute function public.set_updated_at();

-- Streak updater: runs after a session is marked completed
create or replace function public.update_streak()
returns trigger language plpgsql security definer as $$
declare
  v_last date;
  v_streak int;
  v_longest int;
begin
  if new.completed = false or old.completed = true then
    return new;
  end if;

  select last_played_date, current_streak, longest_streak
    into v_last, v_streak, v_longest
    from public.profiles
   where id = new.user_id;

  if v_last = new.puzzle_date - interval '1 day' then
    v_streak := v_streak + 1;
  elsif v_last = new.puzzle_date then
    -- already counted today
    return new;
  else
    v_streak := 1;
  end if;

  v_longest := greatest(v_longest, v_streak);

  update public.profiles
     set current_streak  = v_streak,
         longest_streak  = v_longest,
         last_played_date = new.puzzle_date,
         updated_at       = now()
   where id = new.user_id;

  return new;
end;
$$;

create trigger on_session_completed
  after update on public.game_sessions
  for each row execute function public.update_streak();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles      enable row level security;
alter table public.players        enable row level security;
alter table public.daily_puzzles  enable row level security;
alter table public.game_sessions  enable row level security;

-- Profiles: users can read all profiles (for leaderboard usernames),
--           but only update their own
create policy "profiles_public_read"
  on public.profiles for select using (true);

create policy "profiles_own_update"
  on public.profiles for update
  using (auth.uid() = id);

-- Players: anyone can read (needed for autocomplete + card display)
create policy "players_public_read"
  on public.players for select using (true);

-- Only service role can insert/update players (done via admin page
-- which calls supabase with the service role key server-side,
-- OR you can restrict to specific admin emails via a function)
create policy "players_admin_write"
  on public.players for all
  using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and email = any(string_to_array(
          current_setting('app.admin_emails', true), ','
        ))
    )
  );

-- Daily puzzles: public read, admin write
create policy "puzzles_public_read"
  on public.daily_puzzles for select using (true);

create policy "puzzles_admin_write"
  on public.daily_puzzles for all
  using (
    exists (
      select 1 from auth.users
      where id = auth.uid()
        and email = any(string_to_array(
          current_setting('app.admin_emails', true), ','
        ))
    )
  );

-- Game sessions: users can only see/write their own sessions
-- EXCEPT: Pro users can read ALL completed sessions (for leaderboard)
create policy "sessions_own_write"
  on public.game_sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_own_update"
  on public.game_sessions for update
  using (auth.uid() = user_id);

create policy "sessions_own_read"
  on public.game_sessions for select
  using (
    auth.uid() = user_id
    or (
      -- Pro users can read completed sessions for leaderboard
      completed = true
      and exists (
        select 1 from public.profiles
        where id = auth.uid() and is_pro = true
      )
    )
  );

-- ============================================================
-- Storage
-- ============================================================

-- Create the player-photos bucket (run once)
insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

-- Public read on player photos
create policy "player_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'player-photos');

-- Admin write on player photos
create policy "player_photos_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'player-photos'
    and exists (
      select 1 from auth.users
      where id = auth.uid()
        and email = any(string_to_array(
          current_setting('app.admin_emails', true), ','
        ))
    )
  );

create policy "player_photos_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'player-photos'
    and exists (
      select 1 from auth.users
      where id = auth.uid()
        and email = any(string_to_array(
          current_setting('app.admin_emails', true), ','
        ))
    )
  );

-- ============================================================
-- Set your admin email(s) — run after schema creation
-- Replace with your actual admin email(s), comma-separated
-- ============================================================
-- alter database postgres set app.admin_emails = 'you@example.com';

-- ============================================================
-- Sample data (optional — delete before production)
-- ============================================================

-- insert into public.players (name, position, nation, nation_flag, shirt_number, clubs)
-- values (
--   'Sample Player',
--   'Fullback',
--   'England',
--   '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
--   1,
--   '[{"name":"Leeds Rhinos","years":"2018-23","appearances":134},{"name":"Wigan Warriors","years":"2024","appearances":12}]'
-- );
