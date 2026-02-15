-- ===================================================
-- Playlists & Liked Songs Schema
-- Run this in the Supabase SQL Editor
-- ===================================================

-- 1. User-created playlists
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Songs saved into playlists (junction table)
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  spotify_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  storage_path TEXT,
  duration_ms INTEGER,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(playlist_id, spotify_id)
);

-- 3. Liked songs (per-user)
CREATE TABLE IF NOT EXISTS liked_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  spotify_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  storage_path TEXT,
  duration_ms INTEGER,
  liked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, spotify_id)
);

-- Disable RLS for now (matches existing pattern)
ALTER TABLE playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE liked_songs DISABLE ROW LEVEL SECURITY;
