import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// POST /api/user-playlists/[id]/songs — Add a song to a playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    const { id } = await params;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Verify the playlist belongs to this user
    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", id)
      .eq("user_id", decoded.userId)
      .single();

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const { spotify_id, title, artist, album, cover_url, storage_path, duration_ms } = await request.json();

    if (!spotify_id || !title || !artist) {
      return NextResponse.json({ error: "spotify_id, title, and artist are required" }, { status: 400 });
    }

    const { data: song, error } = await supabase
      .from("playlist_songs")
      .insert({
        playlist_id: id,
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
        return NextResponse.json({ error: "Song already in playlist" }, { status: 409 });
      }
      console.error("Error adding song to playlist:", error);
      return NextResponse.json({ error: "Failed to add song" }, { status: 500 });
    }

    return NextResponse.json({ song }, { status: 201 });
  } catch (error) {
    console.error("Add Song to Playlist API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/user-playlists/[id]/songs — Remove a song from a playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    const { id } = await params;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Verify ownership
    const { data: playlist } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", id)
      .eq("user_id", decoded.userId)
      .single();

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const { spotify_id } = await request.json();

    const { error } = await supabase
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", id)
      .eq("spotify_id", spotify_id);

    if (error) {
      console.error("Error removing song from playlist:", error);
      return NextResponse.json({ error: "Failed to remove song" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove Song from Playlist API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
