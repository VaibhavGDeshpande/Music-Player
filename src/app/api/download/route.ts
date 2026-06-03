import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Fetch duration_ms from Spotify for a single track. Returns 0 on failure. */
async function fetchDurationMs(userId: string, trackId: string): Promise<number> {
  try {
    const accessToken = await getAccessToken(userId);
    if (!accessToken) return 0;

    const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      return data.duration_ms || 0;
    }
  } catch {
    // Non-critical — fall back to 0
  }
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "Missing server config", message: "JWT_SECRET is not set" },
        { status: 500 }
      );
    }

    if (!process.env.SPOTIFY_DOWNLOADER_KEY) {
      return NextResponse.json(
        {
          error: "Missing server config",
          message: "SPOTIFY_DOWNLOADER_KEY is not set",
        },
        { status: 500 }
      );
    }

    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };
    } catch (error) {
      console.error("JWT verify failed:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    let body: { trackId?: string; spotifyUrl?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const trackId = body.trackId?.trim();
    const spotifyUrl = body.spotifyUrl?.trim();

    // Validate inputs
    if (!trackId && !spotifyUrl) {
      return NextResponse.json({ error: "Missing trackId or spotifyUrl" }, { status: 400 });
    }

    // Determine the ID to use
    const finalTrackId = trackId || spotifyUrl!.split("/").pop()?.split("?")[0];
    if (!finalTrackId) {
      return NextResponse.json({ error: "Invalid Spotify URL" }, { status: 400 });
    }

    const finalSpotifyUrl = spotifyUrl || `https://open.spotify.com/track/${trackId}`;

    // 1. Check if song already exists for this user
    const { data: existingSong, error: existingSongError } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", finalTrackId)
      .maybeSingle();

    if (existingSongError) {
      console.error("Existing song lookup error:", existingSongError);
      return NextResponse.json(
        {
          error: "Failed to check existing song",
          message: existingSongError.message,
        },
        { status: 500 }
      );
    }

    if (existingSong) {
      return NextResponse.json({ message: "Song already downloaded", song: existingSong });
    }

    // 2. Fetch download link from RapidAPI
    const rapidApiRes = await fetch(
      `https://spotify-downloader9.p.rapidapi.com/downloadSong?songId=${encodeURIComponent(finalSpotifyUrl)}`,
      {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": process.env.SPOTIFY_DOWNLOADER_KEY,
          "x-rapidapi-host": "spotify-downloader9.p.rapidapi.com",
          "x-api-host": "spotify-downloader9.p.rapidapi.com", 
          "Content-Type": "application/json",
        },
      }
    );

    if (!rapidApiRes.ok) {
      const errorText = await rapidApiRes.text();
      console.error("RapidAPI Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch download link" }, { status: 502 });
    }

    const rapidApiData = await rapidApiRes.json();
    
    if (!rapidApiData.success || !rapidApiData.data?.downloadLink) {
       console.error("RapidAPI Response Invalid:", rapidApiData);
       return NextResponse.json({ error: "Download link not found" }, { status: 404 });
    }

    const { title, artist, album, cover, downloadLink } = rapidApiData.data;


    const mp3Res = await fetch(downloadLink);
    if (!mp3Res.ok) {
      console.error("MP3 Fetch Error Status:", mp3Res.status);
      console.error("MP3 Fetch Error Text:", await mp3Res.text());
      return NextResponse.json({ error: "Failed to download MP3 file" }, { status: 502 });
    }


    const mp3Buffer = await mp3Res.arrayBuffer();

    // 4. Upload to Supabase Storage
    const fileName = `${decoded.userId}/${finalTrackId}.mp3`;
    const { error: storageError } = await supabase.storage
      .from("music")
      .upload(fileName, mp3Buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (storageError) {
      console.error("Storage Upload Error:", storageError);
      return NextResponse.json(
        {
          error: "Failed to upload to storage",
          message: storageError.message,
        },
        { status: 500 }
      );
    }

    // 5. Get Public URL
    supabase.storage.from("music").getPublicUrl(fileName);

    // 6. Insert Metadata into Database
    const { data: song, error: dbError } = await supabase
      .from("songs")
      .insert({
        user_id: decoded.userId,
        spotify_id: finalTrackId,
        title,
        artist,
        album,
        cover_url: cover,
        storage_path: fileName,
        duration_ms: await fetchDurationMs(decoded.userId, finalTrackId),
      })
      .select()
      .single();

    if (dbError) {
       console.error("Database Insert Error:", dbError);
       return NextResponse.json(
         {
           error: "Failed to save song metadata",
           message: dbError.message,
         },
         { status: 500 }
       );
    }

    return NextResponse.json({ success: true, song });

  } catch (error) {
    console.error("Download API Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
