-- ==============================================
-- Playback Sync (Spotify Connect-like) MVP
-- ==============================================

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_key text not null,
  device_name text not null,
  device_type text not null check (device_type in ('web', 'flutter')),
  platform text,
  app_version text,
  is_online boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_key)
);

create index if not exists idx_devices_user_last_seen
  on public.devices (user_id, last_seen_at desc);

create index if not exists idx_devices_user_online
  on public.devices (user_id, is_online);

create table if not exists public.playback_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  active_device_id uuid references public.devices(id) on delete set null,

  track_id text,
  track_title text,
  artist_name text,
  cover_url text,
  stream_url text,

  is_playing boolean not null default false,
  position_ms integer not null default 0 check (position_ms >= 0),
  duration_ms integer,
  playback_rate numeric(4,2) not null default 1.00,
  position_updated_at timestamptz not null default now(),

  state_version bigint not null default 1,
  last_command_id uuid,
  updated_by_device_id uuid references public.devices(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_playback_sessions_active_device
  on public.playback_sessions (active_device_id);

create index if not exists idx_playback_sessions_user_updated
  on public.playback_sessions (user_id, updated_at desc);

alter table public.devices enable row level security;
alter table public.playback_sessions enable row level security;

drop policy if exists "devices_select_own" on public.devices;
create policy "devices_select_own" on public.devices
for select using (auth.uid() = user_id);

drop policy if exists "devices_insert_own" on public.devices;
create policy "devices_insert_own" on public.devices
for insert with check (auth.uid() = user_id);

drop policy if exists "devices_update_own" on public.devices;
create policy "devices_update_own" on public.devices
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions_select_own" on public.playback_sessions;
create policy "sessions_select_own" on public.playback_sessions
for select using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.playback_sessions;
create policy "sessions_insert_own" on public.playback_sessions
for insert with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.playback_sessions;
create policy "sessions_update_own" on public.playback_sessions
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.devices;
alter publication supabase_realtime add table public.playback_sessions;
