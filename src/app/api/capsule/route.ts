import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { userId } = decoded;

    // Default to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Fetch play history for this month
    const { data: history, error } = await supabase
      .from("play_history")
      .select("*")
      .eq("user_id", userId)
      .gte("played_at", startOfMonth)
      .lte("played_at", endOfMonth);

    if (error) {
      console.error("Error fetching stats:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    if (!history || history.length === 0) {
      return NextResponse.json({
        total_minutes: 0,
        top_artists: [],
        top_tracks: [],
        total_plays: 0
      });
    }

    // Calculate Stats
    let totalMs = 0;
    const artistCounts: Record<string, { count: number; image: string | null }> = {};
    const trackCounts: Record<string, { count: number; name: string; artist: string; image: string | null; id: string }> = {};

    history.forEach((play) => {
      totalMs += play.duration_ms || 0;

      // Artist Stats
      if (play.artist_name) {
        if (!artistCounts[play.artist_name]) {
          artistCounts[play.artist_name] = { count: 0, image: play.image_url };
        }
        artistCounts[play.artist_name].count++;
      }

      // Track Stats
      if (play.track_id) {
         if (!trackCounts[play.track_id]) {
          trackCounts[play.track_id] = { 
            count: 0, 
            name: play.track_name, 
            artist: play.artist_name, 
            image: play.image_url,
            id: play.track_id
          };
        }
        trackCounts[play.track_id].count++;
      }
    });

    const totalMinutes = Math.round(totalMs / 60000);

    const topArtists = Object.entries(artistCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topTracks = Object.values(trackCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const uniqueTracksCount = Object.keys(trackCounts).length;

    return NextResponse.json({
      total_minutes: totalMinutes,
      top_artists: topArtists,
      top_tracks: topTracks,
      total_plays: history.length,
      unique_tracks: uniqueTracksCount
    });

  } catch (error) {
    console.error("Capsule Stats API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
