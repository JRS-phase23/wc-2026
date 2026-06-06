-- Allow anyone (logged-in or anonymous) to read competition basic info.
-- This is required for the /join/[code] invite page — an unauthenticated
-- visitor needs to look up the competition by join_code to see the invite
-- landing before they sign up. Competition names and codes are not sensitive.
create policy "Anyone can view competitions"
  on competitions for select
  using (true);
