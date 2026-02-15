import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { data: songs, error } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching songs:", error);
      return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
    }

    if (!songs || songs.length === 0) {
      return NextResponse.json({ songs: [] });
    }

    // Fetch durations from Spotify API in batches of 50
    const { data: user } = await supabase
      .from("profiles")
      .select("access_token")
      .eq("id", decoded.userId)
      .single();

    if (user?.access_token) {
      const spotifyIds = songs
        .map((s) => s.spotify_id)
        .filter((id): id is string => !!id);

      // Spotify /v1/tracks accepts up to 50 IDs at a time
      const durationMap = new Map<string, number>();

      for (let i = 0; i < spotifyIds.length; i += 50) {
        const batch = spotifyIds.slice(i, i + 50);
        try {
          const res = await fetch(
            `https://api.spotify.com/v1/tracks?ids=${batch.join(",")}`,
            {
              headers: { Authorization: `Bearer ${user.access_token}` },
            }
          );

          if (res.ok) {
            const data = await res.json();
            for (const track of data.tracks || []) {
              if (track?.id && track?.duration_ms) {
                durationMap.set(track.id, track.duration_ms);
              }
            }
          }
        } catch (err) {
          console.error("Spotify batch fetch error:", err);
        }
      }

      // Attach duration_ms to each song
      for (const song of songs) {
        if (song.spotify_id && durationMap.has(song.spotify_id)) {
          song.duration_ms = durationMap.get(song.spotify_id);
        }
      }
    }

    return NextResponse.json({ songs });
  } catch (error) {
    console.error("My Songs API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
