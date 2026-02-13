-- Create the Music Storage Bucket
insert into storage.buckets (id, name, public)
values ('music', 'music', true);

-- Create policy to allow authenticated users to upload to the music bucket
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'music' );

-- Create policy to allow public access to view files (so we can play them)
create policy "Allow public viewing"
on storage.objects for select
to public
using ( bucket_id = 'music' );

-- Create the Songs table
create table if not exists songs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  spotify_id text not null,
  title text not null,
  artist text not null,
  album text,
  cover_url text,
  storage_path text not null,
  duration_ms integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, spotify_id)
);

-- Enable Row Level Security (RLS)
alter table songs enable row level security;

-- Policy: Users can only see their own songs
create policy "Users can view their own songs"
on songs for select
using ( auth.uid() = user_id ); 
-- Note: Since we are using manual JWT auth and not Supabase Auth in the standard way, 
-- `auth.uid()` might not work if we aren't setting the Supabase context correctly.
-- For simplicity with the current manual JWT setup, we might need to disable RLS or just manage it in the API.
-- Given the current setup, we will RELY ON THE API to filter by user_id, 
-- but enabling RLS is good practice. However, without `sb-auth-token`, `auth.uid()` is null.
-- So for now, we will strictly enforce user_id checks in the API Application Layer.

-- DISABLE RLS for now to avoid issues with the manual JWT implementation
alter table songs disable row level security;
