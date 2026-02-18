import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { userId } = decoded;

    const body = await request.json();
    const { trackId, trackName, artistName, albumName, imageUrl, durationMs } = body;

    if (!trackId || !trackName) {
      return NextResponse.json({ error: "Missing track details" }, { status: 400 });
    }

    // Insert into play_history
    const { error } = await supabase
      .from("play_history")
      .insert({
        user_id: userId,
        track_id: trackId,
        track_name: trackName,
        artist_name: artistName,
        album_name: albumName,
        image_url: imageUrl,
        duration_ms: durationMs,
        played_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Error logging play:", error);
      return NextResponse.json({ error: "Failed to log play" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Play Log API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
