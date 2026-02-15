import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// GET /api/user-playlists/[id] — Get a single playlist with its songs
export async function GET(
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

    // Fetch the playlist (verify ownership)
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("*")
      .eq("id", id)
      .eq("user_id", decoded.userId)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    // Fetch songs in this playlist
    const { data: songs, error: songsError } = await supabase
      .from("playlist_songs")
      .select("*")
      .eq("playlist_id", id)
      .order("added_at", { ascending: false });

    if (songsError) {
      console.error("Error fetching playlist songs:", songsError);
      return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
    }

    return NextResponse.json({ playlist, songs: songs || [] });
  } catch (error) {
    console.error("Playlist Detail API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/user-playlists/[id] — Delete a playlist
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

    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", id)
      .eq("user_id", decoded.userId);

    if (error) {
      console.error("Error deleting playlist:", error);
      return NextResponse.json({ error: "Failed to delete playlist" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Playlist API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
