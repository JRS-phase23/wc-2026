-- Add icon selection to profiles
alter table profiles
  add column if not exists icon_key text not null default 'ball-classic',
  add column if not exists icon_url  text;

-- icon_key holds either a preset name ('ball-classic', 'ball-modern', etc.)
-- or the sentinel 'custom' when icon_url is set (user-uploaded image)
