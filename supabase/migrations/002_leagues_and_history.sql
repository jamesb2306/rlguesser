-- ============================================================
-- Migration 002: NRL league tags + auto-puzzle tracking
-- Run in Supabase SQL Editor
-- ============================================================

-- Add leagues array to players (e.g. ["SL", "NRL"])
alter table public.players
  add column if not exists leagues text[] not null default array['SL'];

-- Index for filtering by league
create index if not exists players_leagues_idx on public.players using gin(leagues);

-- Track which players have been used recently (for auto-puzzle)
create table if not exists public.puzzle_history (
  player_id  uuid not null references public.players(id) on delete cascade,
  used_date  date not null,
  primary key (player_id, used_date)
);

create index if not exists puzzle_history_date_idx on public.puzzle_history(used_date);

-- RLS on puzzle_history
alter table public.puzzle_history enable row level security;

create policy "puzzle_history_public_read"
  on public.puzzle_history for select using (true);
