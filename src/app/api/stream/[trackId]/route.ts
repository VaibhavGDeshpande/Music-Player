import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";

// ─── Use default export — resolves binary path automatically in prod ──────────
import ytDlpExec from "youtube-dl-exec";

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
    artist:
      data.artists?.map((a: { name: string }) => a.name).join(", ") ||
      "Unknown",
  };
}

async function resolveYtUrl(title: string, artist: string): Promise<string | null> {
  try {
    const ytOutput = (await ytDlpExec(`ytsearch1:${title} ${artist} audio`, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
    })) as { url?: string; entries?: { url: string }[] };

    return ytOutput.entries?.[0]?.url ?? ytOutput.url ?? null;
  } catch (err) {
    console.error("[resolveYtUrl] yt-dlp failed:", err);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const { trackId } = await params;
    const rangeHeader = request.headers.get("range");

    // ── Path 1: Stored in Supabase Storage ───────────────────────────────────
    const { data: existingSong, error: dbError } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .single();

    // PGRST116 = row not found — expected, fall through to yt-dlp
    if (dbError && dbError.code !== "PGRST116") {
      console.error("[stream] Supabase error:", dbError.message);
    }

    if (existingSong?.storage_path) {
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${existingSong.storage_path}`;

      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

      const upstream = await fetch(publicUrl, { headers: fetchHeaders });

      if (!upstream.ok && upstream.status !== 206) {
        console.error("[stream] Supabase fetch failed:", upstream.status);
        return NextResponse.json(
          { error: "Failed to fetch stored audio" },
          { status: 502 }
        );
      }

      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "audio/mpeg");
      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("Cache-Control", "private, max-age=86400"); // permanent file — cache 24h

      const contentLength = upstream.headers.get("content-length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);

      const contentRange = upstream.headers.get("content-range");
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      return new Response(upstream.body, {
        status: rangeHeader ? 206 : upstream.status,
        headers: responseHeaders,
      });
    }

    // ── Path 2: Resolve via yt-dlp ────────────────────────────────────────────
    const metadata = await fetchSpotifyTrack(decoded.userId, trackId);
    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify metadata" },
        { status: 404 }
      );
    }

    const downloadLink = await resolveYtUrl(metadata.title, metadata.artist);
    if (!downloadLink) {
      return NextResponse.json(
        { error: "Could not resolve audio URL from YouTube" },
        { status: 404 }
      );
    }

    // ── REDIRECT instead of proxying ──────────────────────────────────────────
    // Proxying the full audio through a serverless function hits the timeout
    // limit (Vercel: 10s, hobby plan: 5s). Redirecting to the YouTube CDN URL
    // directly solves both the timeout AND seeking — YouTube CDN supports
    // Range requests natively so skip/seek works without any extra code.
    return NextResponse.redirect(downloadLink, 302);

  } catch (error) {
    console.error(
      "[stream] Unhandled error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      {
        error: "Internal Server Error",
        detail: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}