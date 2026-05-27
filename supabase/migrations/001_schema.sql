-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- TABLES (all tables first, no cross-refs in policies yet)
-- ─────────────────────────────────────────────

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  team_name text not null unique,
  created_at timestamptz default now()
);

-- Teams (48 WC 2026 teams)
create table teams (
  id integer primary key,
  name text not null,
  group_letter char(1) not null,
  group_position integer not null,
  flag_code text
);

-- Matches (all 104 matches)
create table matches (
  id integer primary key,
  match_number integer unique not null,
  stage text not null,
  home_label text not null,
  away_label text not null,
  home_team_id integer references teams,
  away_team_id integer references teams,
  kickoff_at timestamptz not null,
  venue text not null,
  home_score integer,
  away_score integer,
  extra_time boolean default false,
  penalties boolean default false,
  penalty_home integer,
  penalty_away integer,
  status text default 'scheduled'
);

-- Competitions
create table competitions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  join_code text not null unique,
  admin_id uuid references profiles not null,
  created_at timestamptz default now()
);

-- Competition members
create table competition_members (
  competition_id uuid references competitions on delete cascade,
  user_id uuid references profiles on delete cascade,
  joined_at timestamptz default now(),
  primary key (competition_id, user_id)
);

-- Picks
create table picks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles on delete cascade not null,
  competition_id uuid references competitions on delete cascade not null,
  match_id integer references matches not null,
  home_score_pick integer not null check (home_score_pick >= 0),
  away_score_pick integer not null check (away_score_pick >= 0),
  advancing_team_id integer references teams,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, competition_id, match_id)
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (all tables exist now)
-- ─────────────────────────────────────────────

alter table profiles enable row level security;
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

alter table teams enable row level security;
create policy "Anyone can view teams" on teams for select using (true);

alter table matches enable row level security;
create policy "Anyone can view matches" on matches for select using (true);
create policy "Only admins can update matches" on matches for update using (
  exists (select 1 from competitions where admin_id = auth.uid())
);

alter table competitions enable row level security;
-- Helpers to break cross-table RLS recursion (competitions ↔ competition_members)
create or replace function public.is_member_of_competition(p_competition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.competition_members
    where competition_id = p_competition_id and user_id = auth.uid()
  )
$$;
create or replace function public.is_competition_admin(p_competition_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.competitions
    where id = p_competition_id and admin_id = auth.uid()
  )
$$;
create policy "Members can view their competitions" on competitions for select using (
  auth.uid() = admin_id or
  public.is_member_of_competition(competitions.id)
);
create policy "Users can create competitions" on competitions for insert with check (auth.uid() = admin_id);
create policy "Admin can update competition" on competitions for update using (auth.uid() = admin_id);

alter table competition_members enable row level security;
create policy "Members can view competition members" on competition_members for select using (
  public.is_member_of_competition(competition_members.competition_id) or
  public.is_competition_admin(competition_members.competition_id)
);
create policy "Users can join competitions" on competition_members for insert with check (auth.uid() = user_id);
create policy "Admin can remove members" on competition_members for delete using (
  exists (select 1 from competitions where id = competition_members.competition_id and admin_id = auth.uid())
  or auth.uid() = user_id
);

alter table picks enable row level security;
create policy "Users can view picks in their competitions" on picks for select using (
  exists (
    select 1 from competition_members
    where competition_id = picks.competition_id and user_id = auth.uid()
  ) or
  exists (select 1 from competitions where id = picks.competition_id and admin_id = auth.uid())
);
create policy "Users can insert own picks" on picks for insert with check (auth.uid() = user_id);
create policy "Users can update own picks" on picks for update using (auth.uid() = user_id);
create policy "Users can delete own picks" on picks for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, team_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'team_name', 'Team ' || substr(new.id::text, 1, 6))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

create or replace function generate_join_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  end loop;
  return result;
end;
$$;
