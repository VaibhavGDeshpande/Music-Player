import { getAccessToken } from "@/lib/spotify";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const accessToken = await getAccessToken(decoded.userId);

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to refresh access token" }, { status: 401 });
    }

    const response = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(await response.json(), { status: response.status });
    }

    const data = await response.json();

    // Upsert playlists into DB (fire-and-forget, don't block the response)
    if (data.items && data.items.length > 0) {
      const rows = data.items.map((p: any) => ({
        user_id: decoded.userId,
        spotify_id: p.id,
        name: p.name,
        description: p.description || null,
        cover_url: p.images?.[0]?.url || null,
        owner_name: p.owner?.display_name || null,
        owner_id: p.owner?.id || null,
        total_tracks: p.tracks?.total || 0,
        snapshot_id: p.snapshot_id || null,
        synced_at: new Date().toISOString(),
      }));

      supabase
        .from("spotify_playlists")
        .upsert(rows, { onConflict: "user_id,spotify_id" })
        .then(({ error }) => {
          if (error) console.error("Error upserting playlists:", error);
        });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in /api/playlists:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}
