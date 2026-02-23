-- Create the play_history table
create table if not exists play_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  track_id text not null,
  track_name text not null,
  artist_name text,
  album_name text,
  image_url text,
  duration_ms integer,
  listened_ms integer default 0,
  played_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for faster querying by user and time
create index if not exists idx_play_history_user_played_at on play_history(user_id, played_at);

-- Disable RLS for now (consistent with other tables in this project)
alter table play_history disable row level security;
