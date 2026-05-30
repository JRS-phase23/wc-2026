-- Tournament winner predictions (one per user per competition)
create table tournament_predictions (
  competition_id uuid references competitions on delete cascade not null,
  user_id        uuid references profiles  on delete cascade not null,
  team_id        integer references teams not null,
  submitted_at   timestamptz default now(),
  primary key (competition_id, user_id)
);

alter table tournament_predictions enable row level security;

create policy "Members can view tournament predictions" on tournament_predictions
  for select using (public.is_member_of_competition(tournament_predictions.competition_id));

create policy "Users can manage own tournament prediction" on tournament_predictions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
