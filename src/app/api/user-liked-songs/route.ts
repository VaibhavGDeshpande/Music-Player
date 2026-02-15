import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// Helper to get user's Spotify access token
async function getSpotifyToken(userId: string): Promise<string | null> {
  const { data: user } = await supabase
    .from("profiles")
    .select("access_token")
    .eq("id", userId)
    .single();
  return user?.access_token || null;
}

// GET /api/user-liked-songs — Get all liked songs for the user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { data: songs, error } = await supabase
      .from("liked_songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .order("liked_at", { ascending: false });

    if (error) {
      console.error("Error fetching liked songs:", error);
      return NextResponse.json({ error: "Failed to fetch liked songs" }, { status: 500 });
    }

    return NextResponse.json({ songs: songs || [] });
  } catch (error) {
    console.error("Liked Songs API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/user-liked-songs — Like a song (saves to local DB + Spotify)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { spotify_id, title, artist, album, cover_url, storage_path, duration_ms } = await request.json();

    if (!spotify_id || !title || !artist) {
      return NextResponse.json({ error: "spotify_id, title, and artist are required" }, { status: 400 });
    }

    // 1. Save to local DB
    const { data: song, error } = await supabase
      .from("liked_songs")
      .insert({
        user_id: decoded.userId,
        spotify_id,
        title,
        artist,
        album: album || null,
        cover_url: cover_url || null,
        storage_path: storage_path || null,
        duration_ms: duration_ms || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ message: "Song already liked" }, { status: 200 });
      }
      console.error("Error liking song:", error);
      return NextResponse.json({ error: "Failed to like song" }, { status: 500 });
    }

    // 2. Sync to Spotify — save the track
    try {
      const spotifyToken = await getSpotifyToken(decoded.userId);
      if (spotifyToken) {
        await fetch(`https://api.spotify.com/v1/me/tracks?ids=${spotify_id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${spotifyToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (spotifyErr) {
      // Don't fail the whole request if Spotify sync fails
      console.error("Spotify sync (like) failed:", spotifyErr);
    }

    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    console.error("Like Song API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/user-liked-songs — Unlike a song (removes from local DB + Spotify)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { spotify_id } = await request.json();

    if (!spotify_id) {
      return NextResponse.json({ error: "spotify_id is required" }, { status: 400 });
    }

    // 1. Remove from local DB
    const { error } = await supabase
      .from("liked_songs")
      .delete()
      .eq("user_id", decoded.userId)
      .eq("spotify_id", spotify_id);

    if (error) {
      console.error("Error unliking song:", error);
      return NextResponse.json({ error: "Failed to unlike song" }, { status: 500 });
    }

    // 2. Sync to Spotify — remove the track
    try {
      const spotifyToken = await getSpotifyToken(decoded.userId);
      if (spotifyToken) {
        await fetch(`https://api.spotify.com/v1/me/tracks?ids=${spotify_id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${spotifyToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (spotifyErr) {
      // Don't fail the whole request if Spotify sync fails
      console.error("Spotify sync (unlike) failed:", spotifyErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unlike Song API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
