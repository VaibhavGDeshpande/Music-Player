import { getAccessToken } from "@/lib/spotify";
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

    // Step 1: Get user's top tracks to use as seeds
    const topTracksRes = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=short_term", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let seedTrackIds: string[] = [];

    if (topTracksRes.ok) {
      const topTracksData = await topTracksRes.json();
      seedTrackIds = topTracksData.items?.map((t: any) => t.id).slice(0, 5) || [];
    }

    // Fallback: if no top tracks, return empty
    if (seedTrackIds.length === 0) {
      // Try medium_term
      const fallbackRes = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=5&time_range=medium_term", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        seedTrackIds = fallbackData.items?.map((t: any) => t.id).slice(0, 5) || [];
      }
    }

    if (seedTrackIds.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    // Step 2: Get recommendations based on seed tracks
    const recsRes = await fetch(
      `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrackIds.join(",")}&limit=20`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!recsRes.ok) {
      const errorData = await recsRes.json();
      return NextResponse.json(errorData, { status: recsRes.status });
    }

    const recsData = await recsRes.json();
    return NextResponse.json(recsData, {
      headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
