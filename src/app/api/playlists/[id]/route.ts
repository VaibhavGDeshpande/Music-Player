
import { getAccessToken } from "@/lib/spotify";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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

    const accessToken = await getAccessToken(decoded.userId);

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to refresh access token" }, { status: 401 });
    }

    const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return NextResponse.json(
        { error: "Spotify rate limit exceeded", retryAfter },
        { status: 429 }
      );
    }

    if (!response.ok) {
       const text = await response.text();
       return NextResponse.json(
         { error: "Spotify API error", message: text },
         { status: response.status }
       );
    }

    const data = await response.json();

    // Upsert playlist tracks into DB (fire-and-forget)
    const tracksData = data.tracks || data;
    const trackItems = tracksData?.items || [];

    if (trackItems.length > 0) {
      const rows = trackItems
        .map((item: any, index: number) => {
          const track = item.track || item.item;
          if (!track || !track.id) return null;

          return {
            playlist_spotify_id: id,
            user_id: decoded.userId,
            spotify_id: track.id,
            title: track.name || "Unknown",
            artist: track.artists?.map((a: any) => a.name).join(", ") || "Unknown",
            album: track.album?.name || null,
            cover_url: track.album?.images?.[0]?.url || null,
            duration_ms: track.duration_ms || null,
            track_number: index,
            preview_url: track.preview_url || null,
            added_at: item.added_at || null,
            storage_path: null,
          };
        })
        .filter(Boolean);

      if (rows.length > 0) {
        supabase
          .from("spotify_playlist_tracks")
          .upsert(rows, { onConflict: "playlist_spotify_id,spotify_id" })
          .then(({ error }) => {
            if (error) console.error("Error upserting playlist tracks:", error);
          });
      }
    }

    return NextResponse.json(data);

  } catch (err: any) {
    console.error("Internal server error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}

// POST - Add a song to a Spotify playlist
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
    const body = await request.json();
    const { spotify_id, title, artist, album, cover_url, duration_ms } = body;

    if (!spotify_id) {
      return NextResponse.json({ error: "spotify_id is required" }, { status: 400 });
    }

    const accessToken = await getAccessToken(decoded.userId);

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to refresh access token" }, { status: 401 });
    }

    // Add track to Spotify playlist
    const spotifyRes = await fetch(`https://api.spotify.com/v1/playlists/${id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [`spotify:track:${spotify_id}`],
      }),
    });

    if (!spotifyRes.ok) {
      const errText = await spotifyRes.text();
      console.error("Spotify add track error:", errText);
      return NextResponse.json(
        { error: "Failed to add track to Spotify playlist", details: errText },
        { status: spotifyRes.status }
      );
    }

    // Also upsert into local DB
    await supabase
      .from("spotify_playlist_tracks")
      .upsert(
        {
          playlist_spotify_id: id,
          user_id: decoded.userId,
          spotify_id,
          title: title || "Unknown",
          artist: artist || "Unknown",
          album: album || null,
          cover_url: cover_url || null,
          duration_ms: duration_ms || null,
          track_number: 0,
          added_at: new Date().toISOString(),
          storage_path: null,
        },
        { onConflict: "playlist_spotify_id,spotify_id" }
      );

    return NextResponse.json({ success: true, message: `Added to playlist` });
  } catch (err: any) {
    console.error("Error adding to Spotify playlist:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}