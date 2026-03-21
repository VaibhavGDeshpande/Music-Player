import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";
import { create } from "youtube-dl-exec";
import path from "path";

const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const ytDlExec = create(
  path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", binaryName)
);

export const dynamic = "force-dynamic";

async function fetchSpotifyTrack(userId: string, trackId: string) {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return null;

  const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    title: data.name as string,
    artist: data.artists?.map((a: { name: string }) => a.name).join(", ") || "Unknown",
  };
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { trackId } = await params;

    // The Range header is what the browser sends when seeking
    // e.g. "Range: bytes=1024000-"
    const rangeHeader = request.headers.get("range");

    // ── Path 1: Stored in Supabase Storage ────────────────────────────────────
    const { data: existingSong } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .single();

    if (existingSong?.storage_path) {
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${existingSong.storage_path}`;

      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

      const upstream = await fetch(publicUrl, { headers: fetchHeaders });

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "audio/mpeg");
      responseHeaders.set("Accept-Ranges", "bytes");

      const contentLength = upstream.headers.get("content-length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);

      const contentRange = upstream.headers.get("content-range");
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      return new Response(upstream.body, {
        status: rangeHeader ? 206 : upstream.status,
        headers: responseHeaders,
      });
    }

    // ── Path 2: Resolve via yt-dlp and stream with Range support ─────────────
    const metadata = await fetchSpotifyTrack(decoded.userId, trackId);
    if (!metadata) {
      return NextResponse.json({ error: "Failed to fetch Spotify metadata" }, { status: 404 });
    }

    const searchQuery = `ytsearch1:${metadata.title} ${metadata.artist} audio`;
    const ytOutput = await ytDlExec(searchQuery, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: "bestaudio[ext=m4a]/bestaudio",
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
    }) as { url?: string; entries?: { url: string }[] };

    const downloadLink = ytOutput.entries?.[0]?.url ?? ytOutput.url ?? null;

    if (!downloadLink) {
      return NextResponse.json({ error: "Could not resolve audio URL" }, { status: 404 });
    }

    // Forward the Range header to YouTube CDN — it supports it natively
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      "Referer": "https://www.youtube.com/",
    };
    if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

    const upstream = await fetch(downloadLink, { headers: fetchHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json({ error: "Failed to fetch audio stream" }, { status: 502 });
    }

    const responseHeaders = new Headers();

    // These three headers are what make seeking work
    responseHeaders.set("Content-Type", "audio/mp4");   // m4a = audio/mp4
    responseHeaders.set("Accept-Ranges", "bytes");       // tells browser: seeking is allowed

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength); // seek bar needs this for duration

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);   // e.g. bytes 102400-204799/9000000

    responseHeaders.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: rangeHeader ? 206 : 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error("Stream API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}