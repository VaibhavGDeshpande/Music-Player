import { getAccessToken } from "@/lib/spotify";
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

    if (!id) {
      return NextResponse.json({ error: "Missing artist ID" }, { status: 400 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const accessToken = await getAccessToken(decoded.userId);

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to refresh access token" }, { status: 401 });
    }

    // Parallel fetch for Artist Details, Top Tracks, and Albums
    const [artistRes, topTracksRes, albumsRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&market=US&limit=10`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!artistRes.ok) {
      return NextResponse.json(await artistRes.json(), { status: artistRes.status });
    }

    const artistData = await artistRes.json();
    const topTracksData = topTracksRes.ok ? await topTracksRes.json() : { tracks: [] };
    const albumsData = albumsRes.ok ? await albumsRes.json() : { items: [] };

    return NextResponse.json({
      ...artistData,
      top_tracks: topTracksData.tracks,
      albums: albumsData.items,
    });
  } catch (error) {
    console.error("Artist API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
