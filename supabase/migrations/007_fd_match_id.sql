-- Link matches to football-data.org match IDs for automated result sync
alter table matches add column if not exists fd_match_id integer unique;
