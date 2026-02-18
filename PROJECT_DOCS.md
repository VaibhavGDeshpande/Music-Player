# MusicPlayer — Complete Project Documentation

> **Purpose**: This document describes the full architecture, API surface, database schema, and feature set of the MusicPlayer web app. It is intended to serve as a reference for developing the Flutter mobile app counterpart.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack (Web)](#2-tech-stack-web)
3. [Authentication Flow](#3-authentication-flow)
4. [Database Schema (Supabase)](#4-database-schema-supabase)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Feature Breakdown](#7-feature-breakdown)
8. [Environment Variables](#8-environment-variables)
9. [Flutter App — Proposed Architecture](#9-flutter-app--proposed-architecture)
10. [Flutter Folder Structure](#10-flutter-folder-structure)

---

## 1. Project Overview

MusicPlayer is a Spotify-integrated music streaming app that allows users to:

- **Login** via Spotify OAuth
- **Browse** their Spotify playlists
- **Search** for tracks, artists, and albums on Spotify
- **Download** songs (via RapidAPI) and store MP3s in Supabase Storage
- **Stream** downloaded songs from Supabase Storage URLs
- **Like/Unlike** songs (synced to both local DB and Spotify)
- **Create custom playlists** and add/remove songs
- **View synced lyrics** with real-time highlighting
- **Control playback** (play, pause, next, previous, seek, loop, volume)

---

## 2. Tech Stack (Web)

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Framework | **Next.js 16** (App Router, Turbopack)           |
| Language  | **TypeScript**                                   |
| Styling   | **Tailwind CSS v4**                              |
| Auth      | **Spotify OAuth 2.0** + **JWT** (session cookie) |
| Database  | **Supabase** (PostgreSQL)                        |
| Storage   | **Supabase Storage** (MP3 files)                 |
| APIs      | Spotify Web API, RapidAPI (downloader), Lyrics   |
| Font      | Inter (Google Fonts)                             |

---

## 3. Authentication Flow

```
User clicks "Login with Spotify"
        │
        ▼
GET /api/auth/login
  → Redirects to Spotify OAuth authorize URL
  → Scopes: user-read-email, user-read-private,
             user-library-read, playlist-read-private,
             playlist-read-collaborative
        │
        ▼
Spotify callback → GET /api/auth/callback
  1. Exchange authorization code for access_token + refresh_token
  2. Fetch user profile from Spotify /v1/me
  3. Upsert profile into Supabase `profiles` table
  4. Create JWT with { userId } payload (expires 7d)
  5. Set `session` cookie (httpOnly, sameSite: lax)
  6. Redirect to /dashboard
        │
        ▼
Middleware (middleware.ts)
  - Runs on every request
  - Checks for `session` cookie
  - Public routes: /login, /api/auth/*
  - No cookie → redirect to /login
```

### Token Refresh

The `getAccessToken(userId)` helper in `lib/spotify.ts`:

- Reads `access_token`, `refresh_token`, `token_expires_at` from DB
- If token expires within 5 minutes → refreshes via Spotify token endpoint
- Updates DB with new token (and new refresh_token if rotated)
- Returns a valid access token

### Logout

`POST /api/auth/logout` — Deletes the `session` cookie.

---

## 4. Database Schema (Supabase)

### `profiles`

| Column            | Type        | Notes                         |
| ----------------- | ----------- | ----------------------------- |
| id                | uuid (PK)   | Auto-generated                |
| spotify_user_id   | text        | Unique, from Spotify          |
| display_name      | text        |                               |
| email             | text        |                               |
| profile_image_url | text        | Nullable                      |
| country           | text        |                               |
| product_type      | text        | "premium", "free", etc.       |
| access_token      | text        | Spotify OAuth access token    |
| refresh_token     | text        | Spotify OAuth refresh token   |
| token_expires_at  | timestamptz | When the access token expires |

### `songs` (Downloaded songs)

| Column       | Type        | Notes                    |
| ------------ | ----------- | ------------------------ |
| id           | uuid (PK)   | Auto-generated           |
| user_id      | uuid (FK)   | References `profiles.id` |
| spotify_id   | text        | Spotify track ID         |
| title        | text        |                          |
| artist       | text        |                          |
| album        | text        | Nullable                 |
| cover_url    | text        | Album art URL            |
| storage_path | text        | Path in Supabase Storage |
| duration_ms  | integer     | Track duration in ms     |
| created_at   | timestamptz | Auto-generated           |

**Storage URL pattern**: `{SUPABASE_URL}/storage/v1/object/public/music/{user_id}/{spotify_id}.mp3`

### `liked_songs`

| Column       | Type        | Notes                    |
| ------------ | ----------- | ------------------------ |
| id           | uuid (PK)   | Auto-generated           |
| user_id      | uuid (FK)   | References `profiles.id` |
| spotify_id   | text        | Unique per user          |
| title        | text        |                          |
| artist       | text        |                          |
| album        | text        | Nullable                 |
| cover_url    | text        | Nullable                 |
| storage_path | text        | Nullable                 |
| duration_ms  | integer     | Nullable                 |
| liked_at     | timestamptz | Auto-generated           |

### `playlists`

| Column       | Type        | Notes                                    |
| ------------ | ----------- | ---------------------------------------- |
| id           | uuid (PK)   | Auto-generated                           |
| user_id      | uuid (FK)   | References `profiles.id`                 |
| spotify_id   | text        | Nullable (null for local-only playlists) |
| name         | text        |                                          |
| description  | text        | Nullable                                 |
| cover_url    | text        | Nullable                                 |
| owner_name   | text        | Nullable                                 |
| owner_id     | text        | Nullable                                 |
| total_tracks | integer     | Default 0                                |
| snapshot_id  | text        | Nullable                                 |
| synced_at    | timestamptz | Nullable                                 |
| created_at   | timestamptz | Auto-generated                           |

**Unique constraint**: `(user_id, spotify_id)`

### `playlist_songs` (Local playlist tracks)

| Column       | Type        | Notes                     |
| ------------ | ----------- | ------------------------- |
| id           | uuid (PK)   |                           |
| playlist_id  | uuid (FK)   | References `playlists.id` |
| spotify_id   | text        |                           |
| title        | text        |                           |
| artist       | text        |                           |
| album        | text        | Nullable                  |
| cover_url    | text        | Nullable                  |
| storage_path | text        | Nullable                  |
| duration_ms  | integer     | Nullable                  |
| added_at     | timestamptz | Auto-generated            |

### `spotify_playlist_tracks` (Synced Spotify playlist tracks)

| Column              | Type        | Notes                    |
| ------------------- | ----------- | ------------------------ |
| id                  | uuid (PK)   |                          |
| playlist_spotify_id | text        | Spotify playlist ID      |
| user_id             | uuid (FK)   | References `profiles.id` |
| spotify_id          | text        | Spotify track ID         |
| title               | text        |                          |
| artist              | text        |                          |
| album               | text        | Nullable                 |
| cover_url           | text        | Nullable                 |
| duration_ms         | integer     | Nullable                 |
| track_number        | integer     |                          |
| preview_url         | text        | Nullable                 |
| added_at            | timestamptz | Nullable                 |
| storage_path        | text        | Nullable                 |

**Unique constraint**: `(playlist_spotify_id, spotify_id)`

---

## 5. API Endpoints Reference

All endpoints require the `session` cookie (JWT) unless noted otherwise.

### Authentication

| Method | Endpoint             | Auth | Description                                 |
| ------ | -------------------- | ---- | ------------------------------------------- |
| GET    | `/api/auth/login`    | No   | Redirects to Spotify OAuth                  |
| GET    | `/api/auth/callback` | No   | Handles OAuth callback, sets session cookie |
| POST   | `/api/auth/logout`   | No   | Clears session cookie                       |

### User Profile

| Method | Endpoint  | Description                                |
| ------ | --------- | ------------------------------------------ |
| GET    | `/api/me` | Returns the current user's profile from DB |

**Response**: Full `profiles` row as JSON.

### Spotify Playlists (Read-only from Spotify)

| Method | Endpoint              | Query Params                               | Description                               |
| ------ | --------------------- | ------------------------------------------ | ----------------------------------------- |
| GET    | `/api/playlists`      | —                                          | Lists user's Spotify playlists (up to 50) |
| GET    | `/api/playlists/[id]` | —                                          | Gets playlist details + tracks            |
| POST   | `/api/playlists/[id]` | Body: `{ spotify_id, title, artist, ... }` | Adds a track to a Spotify playlist        |

### Search

| Method | Endpoint      | Query Params   | Description                                  |
| ------ | ------------- | -------------- | -------------------------------------------- |
| GET    | `/api/search` | `q` (required) | Searches Spotify for tracks, artists, albums |

### Downloaded Songs

| Method | Endpoint        | Body                        | Description                                               |
| ------ | --------------- | --------------------------- | --------------------------------------------------------- |
| GET    | `/api/my-songs` | —                           | Returns all downloaded songs for user                     |
| POST   | `/api/download` | `{ trackId?, spotifyUrl? }` | Downloads a song via RapidAPI, stores in Supabase Storage |

**Download flow**:

1. Check if song already exists for user
2. Fetch download link from RapidAPI
3. Download MP3 binary
4. Upload to Supabase Storage: `music/{userId}/{trackId}.mp3`
5. Insert metadata into `songs` table

### Liked Songs

| Method | Endpoint                | Description                                         |
| ------ | ----------------------- | --------------------------------------------------- |
| GET    | `/api/liked-songs`      | Fetches liked songs **from Spotify** (paginated)    |
| GET    | `/api/user-liked-songs` | Fetches liked songs **from local DB**               |
| POST   | `/api/user-liked-songs` | Likes a song (saves to DB + syncs to Spotify)       |
| DELETE | `/api/user-liked-songs` | Unlikes a song (removes from DB + syncs to Spotify) |

**POST body**: `{ spotify_id, title, artist, album?, cover_url?, storage_path?, duration_ms? }`  
**DELETE body**: `{ spotify_id }`

### User Playlists (Local)

| Method | Endpoint                         | Description                      |
| ------ | -------------------------------- | -------------------------------- |
| GET    | `/api/user-playlists`            | Lists all user playlists from DB |
| POST   | `/api/user-playlists`            | Creates a new playlist           |
| GET    | `/api/user-playlists/[id]`       | Gets playlist details + songs    |
| DELETE | `/api/user-playlists/[id]`       | Deletes a playlist               |
| POST   | `/api/user-playlists/[id]/songs` | Adds a song to a playlist        |
| DELETE | `/api/user-playlists/[id]/songs` | Removes a song from a playlist   |

### Lyrics

| Method | Endpoint      | Query Params         | Description                       |
| ------ | ------------- | -------------------- | --------------------------------- |
| GET    | `/api/lyrics` | `trackid` (required) | Fetches synced lyrics for a track |

**Response**: `{ lines: [{ startTimeMs: "12345", words: "Hello world" }, ...] }`

---

## 6. Frontend Architecture

### Pages

| Route                          | Description                                           |
| ------------------------------ | ----------------------------------------------------- |
| `/`                            | Splash screen → redirects to `/dashboard` or `/login` |
| `/login`                       | Spotify login page                                    |
| `/profile`                     | User profile page                                     |
| `/dashboard`                   | Main dashboard (playlists grid)                       |
| `/dashboard/search`            | Search Spotify                                        |
| `/dashboard/my-songs`          | Downloaded songs library                              |
| `/dashboard/library`           | Liked songs from Spotify                              |
| `/dashboard/playlists/[id]`    | Spotify playlist detail                               |
| `/dashboard/my-playlists`      | User's custom playlists                               |
| `/dashboard/my-playlists/[id]` | Custom playlist detail                                |
| `/dashboard/settings`          | App settings                                          |

### Components

| Component            | Description                                                          |
| -------------------- | -------------------------------------------------------------------- |
| `Sidebar`            | Navigation sidebar with links to all sections                        |
| `Player`             | Full player: mini player (mobile), big player (mobile), desktop bar  |
| `SongRow`            | Reusable song row with play, like, download, add-to-playlist actions |
| `SongTableHeader`    | Column headers for song lists                                        |
| `SaveToPlaylistMenu` | Dropdown menu to add a song to a user playlist                       |

### Contexts

| Context         | State Managed                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PlayerContext` | `currentTrack`, `isPlaying`, `queue`, `currentIndex`, `isLooping`, `volume`, `currentTime`, `duration`, `downloadedSongs`, `likedSongs`, `mySongsCache`, `likedSongsCache` |

### Player Features

- **Audio Playback**: HTML5 `<audio>` element managed via React refs
- **Queue System**: Array of tracks with prev/next navigation
- **Loop**: Toggleable single-song loop (restarts on song end)
- **Volume Control**: 0–1 slider, mute/unmute toggle (desktop only)
- **Seek**: Click/drag progress bar
- **Synced Lyrics**: Real-time lyric highlighting with auto-scroll
- **Persistent Playback**: Audio persists across page navigation via PlayerContext

---

## 7. Feature Breakdown

### Song Download Flow

1. User finds a song (search or from playlist)
2. Clicks download button on `SongRow`
3. `POST /api/download` with `{ trackId }` or `{ spotifyUrl }`
4. Backend downloads MP3 → uploads to Supabase Storage → saves metadata
5. Song appears in "My Songs" library
6. Audio streams from Supabase Storage public URL

### Like/Unlike Flow

1. User clicks heart icon
2. Optimistic UI update (instant toggle)
3. `POST` or `DELETE` to `/api/user-liked-songs`
4. Backend saves/removes from local DB + syncs to Spotify

### Playlist Management

1. User creates a playlist via "My Playlists" page
2. Adds songs via `SaveToPlaylistMenu` component
3. Songs stored in `playlist_songs` table

---

## 8. Environment Variables

| Variable                    | Description                             |
| --------------------------- | --------------------------------------- |
| `SPOTIFY_CLIENT_ID`         | Spotify app client ID                   |
| `SPOTIFY_CLIENT_SECRET`     | Spotify app client secret               |
| `SPOTIFY_REDIRECT_URI`      | OAuth callback URL                      |
| `NEXT_PUBLIC_SUPABASE_URL`  | Supabase project URL                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `JWT_SECRET`                | Secret for signing session JWTs         |
| `SPOTIFY_DOWNLOADER_KEY`    | RapidAPI key for song downloader        |

---

## 9. Flutter App — Proposed Architecture

### Key Decisions for Flutter

| Decision             | Recommendation                                                  |
| -------------------- | --------------------------------------------------------------- |
| **State Management** | **Riverpod** (or Provider) — mirrors React Context pattern      |
| **HTTP Client**      | **Dio** — interceptors for auth token injection                 |
| **Audio Playback**   | **just_audio** — supports streaming, seeking, looping, volume   |
| **Auth**             | **flutter_web_auth_2** — OAuth PKCE flow with Spotify           |
| **Storage**          | **shared_preferences** for JWT, **hive** for offline cache      |
| **Navigation**       | **go_router** — declarative routing with guards                 |
| **API Layer**        | Reuse the **same Next.js backend** — Flutter calls the same API |

### Auth Strategy for Flutter

Two options:

**Option A — Reuse Web Backend (Recommended for MVP)**

1. Open Spotify OAuth in a webview/browser via `flutter_web_auth_2`
2. Redirect URI points to your Next.js backend (`/api/auth/callback`)
3. Backend sets session cookie → Flutter extracts it from webview
4. All API calls include the session cookie

**Option B — Direct Spotify + Supabase (Full Native)**

1. Use Spotify SDK or OAuth in-app
2. Exchange code for tokens directly
3. Store tokens locally (secure storage)
4. Call Supabase directly using `supabase_flutter` package
5. No Next.js backend required (but you'd reimplement all logic)

---

## 10. Flutter Folder Structure

```
lib/
├── main.dart                        # App entry, providers, MaterialApp
├── app/
│   ├── app.dart                     # App widget, theme, router setup
│   └── router.dart                  # GoRouter config + auth guards
│
├── config/
│   ├── constants.dart               # API base URL, Supabase URL, etc.
│   ├── theme.dart                   # Dark theme, colors, text styles
│   └── env.dart                     # Environment variable loader
│
├── core/
│   ├── network/
│   │   ├── api_client.dart          # Dio instance + interceptors
│   │   ├── api_endpoints.dart       # Endpoint constants
│   │   └── api_exceptions.dart      # Custom error handling
│   ├── storage/
│   │   ├── secure_storage.dart      # JWT/session token storage
│   │   └── cache_manager.dart       # Offline song cache (Hive)
│   └── utils/
│       ├── formatters.dart          # Duration formatting, etc.
│       └── extensions.dart          # Dart extensions
│
├── models/
│   ├── profile.dart                 # User profile model
│   ├── track.dart                   # Song/track model
│   ├── playlist.dart                # Playlist model
│   ├── lyric_line.dart              # Lyric line model
│   └── playlist_song.dart           # Playlist song junction model
│
├── services/
│   ├── auth_service.dart            # Login, logout, token management
│   ├── player_service.dart          # just_audio wrapper, queue, loop
│   ├── spotify_service.dart         # Search, playlists from Spotify
│   ├── download_service.dart        # Download song API calls
│   ├── library_service.dart         # My Songs, liked songs
│   ├── playlist_service.dart        # User playlists CRUD
│   └── lyrics_service.dart          # Fetch synced lyrics
│
├── providers/
│   ├── auth_provider.dart           # Auth state (logged in/out)
│   ├── player_provider.dart         # Player state (mirrors PlayerContext)
│   ├── library_provider.dart        # My songs + liked songs cache
│   └── playlist_provider.dart       # Playlists state
│
├── screens/
│   ├── splash/
│   │   └── splash_screen.dart       # Splash → auth check → navigate
│   ├── login/
│   │   └── login_screen.dart        # Spotify login UI
│   ├── dashboard/
│   │   └── dashboard_screen.dart    # Home with playlist grid
│   ├── search/
│   │   └── search_screen.dart       # Search Spotify
│   ├── my_songs/
│   │   └── my_songs_screen.dart     # Downloaded songs list
│   ├── library/
│   │   └── library_screen.dart      # Liked songs from Spotify
│   ├── playlist_detail/
│   │   └── playlist_detail_screen.dart # Spotify playlist tracks
│   ├── my_playlists/
│   │   ├── my_playlists_screen.dart # User custom playlists
│   │   └── my_playlist_detail_screen.dart
│   ├── profile/
│   │   └── profile_screen.dart      # User profile
│   └── settings/
│       └── settings_screen.dart     # App settings
│
├── widgets/
│   ├── player/
│   │   ├── mini_player.dart         # Bottom mini player bar
│   │   ├── full_player.dart         # Full-screen player
│   │   ├── lyrics_view.dart         # Synced lyrics panel
│   │   └── progress_bar.dart        # Seek bar widget
│   ├── song_tile.dart               # Reusable song list tile
│   ├── song_table_header.dart       # Column headers
│   ├── playlist_card.dart           # Playlist grid card
│   ├── save_to_playlist_sheet.dart  # Bottom sheet to add to playlist
│   ├── sidebar.dart                 # Navigation sidebar (tablet/desktop)
│   ├── bottom_nav_bar.dart          # Bottom navigation (mobile)
│   ├── skeleton_loader.dart         # Loading shimmer
│   └── gradient_background.dart     # Reusable gradient backgrounds
│
└── assets/                          # (in project root, not lib/)
    ├── images/
    │   └── logo.jpg
    ├── fonts/
    └── icons/
```

### Mapping Web → Flutter Components

| Web (Next.js)            | Flutter Equivalent                          |
| ------------------------ | ------------------------------------------- |
| `PlayerContext`          | `PlayerProvider` (Riverpod/ChangeNotifier)  |
| `Player.tsx`             | `MiniPlayer` + `FullPlayer` widgets         |
| `Sidebar.tsx`            | `Sidebar` (tablet) + `BottomNavBar` (phone) |
| `SongRow.tsx`            | `SongTile` widget                           |
| `SaveToPlaylistMenu.tsx` | `SaveToPlaylistSheet` (bottom sheet)        |
| `middleware.ts`          | `GoRouter` redirect guards                  |
| `globals.css` animations | Flutter `AnimationController` / `Hero`      |

### Key Packages

```yaml
dependencies:
  flutter:
    sdk: flutter
  # State
  flutter_riverpod: ^2.0.0
  # Network
  dio: ^5.0.0
  # Audio
  just_audio: ^0.9.0
  audio_service: ^0.18.0
  # Auth
  flutter_web_auth_2: ^3.0.0
  # Storage
  shared_preferences: ^2.0.0
  hive_flutter: ^1.0.0
  flutter_secure_storage: ^9.0.0
  # Supabase (if going direct)
  supabase_flutter: ^2.0.0
  # UI
  cached_network_image: ^3.0.0
  shimmer: ^3.0.0
  google_fonts: ^6.0.0
  # Navigation
  go_router: ^14.0.0
```

---

> **Tip**: Since the Flutter app will share the same Supabase and Spotify backends, you can iteratively build it screen-by-screen, starting with auth → dashboard → my-songs → player → search → playlists → lyrics.
