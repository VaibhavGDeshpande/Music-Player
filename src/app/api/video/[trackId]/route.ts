import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";
import { create } from "youtube-dl-exec";
import path from "path";

const ytDlExec = create(path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe"));
export const dynamic = "force-dynamic";

async function fetchSpotifyTrack(userId: string, trackId: string) {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return null;

  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.ok) {
    const data = await res.json();
    return {
      title: data.name,
      artist: data.artists?.map((a: any) => a.name).join(", ") || "Unknown",
    };
  }
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; };
    const { trackId } = await params;

    const metadata = await fetchSpotifyTrack(decoded.userId, trackId);
    if (!metadata) {
      return NextResponse.json({ error: "Failed to fetch Spotify metadata" }, { status: 404 });
    }

    const searchQuery = `ytsearch1:${metadata.title} ${metadata.artist} official video`;
    const ytOutput = await ytDlExec(searchQuery, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: "best",
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"]
    });

    const downloadLink = (ytOutput as any).entries ? (ytOutput as any).entries[0].url : (ytOutput as any).url;
    
    if (!downloadLink) {
      return NextResponse.json({ error: "Video link not found" }, { status: 404 });
    }

    // Redirect the native video player directly to Google's CDN.
    // This allows the browser to natively handle high-speed MP4 Range chunking,
    // avoiding the deep latency of executing yt-dlp on every skipped second.
    return NextResponse.redirect(downloadLink);
  } catch (error) {
    console.error("Video API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
