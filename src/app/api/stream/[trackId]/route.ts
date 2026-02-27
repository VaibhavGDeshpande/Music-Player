import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const { trackId } = await params;

    // 1. Check if the song is already stored in Supabase
    const { data: existingSong } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .single();

    if (existingSong?.storage_path) {
      // --- STORED SONG: proxy from Supabase Storage with Range support ---
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/music/${existingSong.storage_path}`;

      // Forward Range header if present (for seeking)
      const rangeHeader = request.headers.get("range");
      const headers: Record<string, string> = {};
      if (rangeHeader) {
        headers["Range"] = rangeHeader;
      }

      const upstream = await fetch(publicUrl, { headers });

      // Build response headers
      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "audio/mpeg");
      responseHeaders.set("Accept-Ranges", "bytes");
      responseHeaders.set("Cache-Control", "public, max-age=86400");

      const contentLength = upstream.headers.get("content-length");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);

      const contentRange = upstream.headers.get("content-range");
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      return new Response(upstream.body, {
        status: upstream.status, // 200 or 206 (partial)
        headers: responseHeaders,
      });
    }

    // --- NOT STORED: stream via RapidAPI download link ---

    // We need a Spotify URL for the downloader API
    const spotifyUrl = `https://open.spotify.com/track/${trackId}`;

    const rapidApiRes = await fetch(
      `https://spotify-downloader9.p.rapidapi.com/downloadSong?songId=${encodeURIComponent(spotifyUrl)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": process.env.SPOTIFY_DOWNLOADER_KEY!,
          "x-rapidapi-host": "spotify-downloader9.p.rapidapi.com",
          "x-api-host": "spotify-downloader9.p.rapidapi.com",
          "Content-Type": "application/json",
        },
      }
    );

    if (!rapidApiRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch download link" },
        { status: 502 }
      );
    }

    const rapidApiData = await rapidApiRes.json();

    if (!rapidApiData.success || !rapidApiData.data?.downloadLink) {
      return NextResponse.json(
        { error: "Download link not found" },
        { status: 404 }
      );
    }

    const { downloadLink } = rapidApiData.data;

    // Fetch the MP3 and stream it to the client
    const mp3Res = await fetch(downloadLink);
    if (!mp3Res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch MP3" },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "audio/mpeg");
    responseHeaders.set("Cache-Control", "no-store"); // don't cache ephemeral links

    const mp3ContentLength = mp3Res.headers.get("content-length");
    if (mp3ContentLength)
      responseHeaders.set("Content-Length", mp3ContentLength);

    return new Response(mp3Res.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Stream API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
