-- Stage submissions: tracks when a player has submitted their picks for a stage
create table stage_submissions (
  competition_id uuid references competitions on delete cascade not null,
  user_id        uuid references profiles on delete cascade not null,
  stage          text not null,
  submitted_at   timestamptz default now(),
  primary key (competition_id, user_id, stage)
);

alter table stage_submissions enable row level security;

-- Members of a competition can see each other's submission status
create policy "Members can view stage submissions" on stage_submissions for select using (
  public.is_member_of_competition(stage_submissions.competition_id) or
  public.is_competition_admin(stage_submissions.competition_id)
);
create policy "Users can submit own stages" on stage_submissions for insert with check (auth.uid() = user_id);
create policy "Users can delete own submissions" on stage_submissions for delete using (auth.uid() = user_id);
