import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getAccessToken } from "@/lib/spotify";
import { create } from "youtube-dl-exec";
import path from "path";

const ytDlExec = create(path.join(process.cwd(), "node_modules", "youtube-dl-exec", "bin", "yt-dlp.exe"));

/** Fetch full metadata from Spotify for a single track. */
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
      album: data.album?.name || "Unknown",
      cover: data.album?.images?.[0]?.url || "",
      duration_ms: data.duration_ms || 0,
    };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { trackId, spotifyUrl } = await request.json();

    if (!trackId && !spotifyUrl) {
      return NextResponse.json({ error: "Missing trackId or spotifyUrl" }, { status: 400 });
    }

    const finalTrackId = trackId || spotifyUrl.split("/").pop().split("?")[0];

    // 1. Check if song already exists for this user
    const { data: existingSong } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", finalTrackId)
      .single();

    if (existingSong) {
      return NextResponse.json({ message: "Song already downloaded", song: existingSong });
    }

    // 2. Fetch metadata from Spotify
    const metadata = await fetchSpotifyTrack(decoded.userId, finalTrackId);
    if (!metadata) {
      return NextResponse.json({ error: "Failed to fetch Spotify metadata" }, { status: 404 });
    }

    // 3. Search and get direct URL using yt-dlp
    const searchQuery = `ytsearch1:${metadata.title} ${metadata.artist} audio`;
    const ytOutput = await ytDlExec(searchQuery, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      format: "bestaudio",
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"]
    });

    const downloadLink = (ytOutput as any).entries ? (ytOutput as any).entries[0].url : (ytOutput as any).url;
    if (!downloadLink) {
        return NextResponse.json({ error: "Audio stream not found on YouTube" }, { status: 404 });
    }

    // 4. Download MP3 buffer
    const mp3Res = await fetch(downloadLink, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!mp3Res.ok) {
      return NextResponse.json({ error: "Failed to download MP3 file" }, { status: 502 });
    }

    const mp3Buffer = await mp3Res.arrayBuffer();

    // 5. Upload to Supabase Storage
    const fileName = `${decoded.userId}/${finalTrackId}.mp3`;
    const { error: storageError } = await supabase.storage
      .from("music")
      .upload(fileName, mp3Buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (storageError) {
      return NextResponse.json({ error: "Failed to upload to storage" }, { status: 500 });
    }

    // 6. Insert Metadata into Database
    const { data: song, error: dbError } = await supabase
      .from("songs")
      .insert({
        user_id: decoded.userId,
        spotify_id: finalTrackId,
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        cover_url: metadata.cover,
        storage_path: fileName,
        duration_ms: metadata.duration_ms,
      })
      .select()
      .single();

    if (dbError) {
       return NextResponse.json({ error: "Failed to save song metadata" }, { status: 500 });
    }

    return NextResponse.json({ success: true, song });

  } catch (error) {
    console.error("Download API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
