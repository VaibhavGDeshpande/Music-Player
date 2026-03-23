import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";
import { create } from "youtube-dl-exec";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // مهم for Vercel

// Safer yt-dlp setup
let ytDlExec: ReturnType<typeof create> | null = null;

try {
  const binaryName = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  ytDlExec = create(
    path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", binaryName)
  );
} catch (err) {
  console.error("yt-dlp init failed:", err);
  ytDlExec = null;
}

async function fetchSpotifyTrack(userId: string, trackId: string) {
  try {
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
  } catch (err) {
    console.error("Spotify fetch error:", err);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { trackId: string } } // FIXED
) {
  try {
    console.log("Incoming stream request");

    // ── ENV CHECK ───────────────────────────────────────────────
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set");
    }

    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
    } catch (err) {
      console.error("JWT verify failed:", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { trackId } = params;
    const rangeHeader = request.headers.get("range");

    // ── Path 1: Supabase Storage ────────────────────────────────
    const { data: existingSong, error } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
    }

    if (existingSong?.storage_path) {
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${existingSong.storage_path}`;

      const fetchHeaders: Record<string, string> = {};
      if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

      const upstream = await fetch(publicUrl, { headers: fetchHeaders });

      if (!upstream.ok || !upstream.body) {
        throw new Error("Failed to fetch from Supabase storage");
      }

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

    // ── Path 2: yt-dlp fallback ────────────────────────────────
    if (!ytDlExec) {
      return NextResponse.json(
        { error: "Audio resolver unavailable (yt-dlp failed)" },
        { status: 500 }
      );
    }

    const metadata = await fetchSpotifyTrack(decoded.userId, trackId);

    if (!metadata) {
      return NextResponse.json(
        { error: "Failed to fetch Spotify metadata" },
        { status: 404 }
      );
    }

    const searchQuery = `ytsearch1:${metadata.title} ${metadata.artist} audio`;

    let ytOutput: any;

    try {
      ytOutput = await ytDlExec(searchQuery, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        format: "bestaudio[ext=m4a]/bestaudio",
        addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
      });
    } catch (err) {
      console.error("yt-dlp execution failed:", err);
      return NextResponse.json(
        { error: "yt-dlp failed on Vercel" },
        { status: 500 }
      );
    }

    const downloadLink =
      ytOutput?.entries?.[0]?.url ?? ytOutput?.url ?? null;

    if (!downloadLink) {
      return NextResponse.json(
        { error: "Could not resolve audio URL" },
        { status: 404 }
      );
    }

    const fetchHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.youtube.com/",
    };

    if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

    const upstream = await fetch(downloadLink, { headers: fetchHeaders });

    if ((!upstream.ok && upstream.status !== 206) || !upstream.body) {
      throw new Error("Failed to fetch audio stream");
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "audio/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");

    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    responseHeaders.set("Cache-Control", "no-store");

    return new Response(upstream.body, {
      status: rangeHeader ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Stream API Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}