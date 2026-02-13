import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { trackId, spotifyUrl } = await request.json();

    // Validate inputs
    if (!trackId && !spotifyUrl) {
      return NextResponse.json({ error: "Missing trackId or spotifyUrl" }, { status: 400 });
    }

    // Determine the ID to use
    const finalTrackId = trackId || spotifyUrl.split("/").pop().split("?")[0];
    const finalSpotifyUrl = spotifyUrl || `https://open.spotify.com/track/${trackId}`;

    // 1. Check if song already exists for this user
    const { data: existingSong } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", finalTrackId)
      .single();

    if (existingSong) {
      console.log("Song already exists:", existingSong.title);
      return NextResponse.json({ message: "Song already downloaded", song: existingSong });
    }

    // 2. Fetch download link from RapidAPI
    console.log("Fetching download link for:", finalSpotifyUrl);
    const rapidApiRes = await fetch(
      `https://spotify-downloader9.p.rapidapi.com/downloadSong?songId=${encodeURIComponent(finalSpotifyUrl)}`,
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

 
    console.log("Downloading MP3 from:", downloadLink);
    const mp3Res = await fetch(downloadLink);
    if (!mp3Res.ok) {
      console.error("MP3 Fetch Error:", mp3Res.status);
      return NextResponse.json({ error: "Failed to download MP3 file" }, { status: 502 });
    }

    const mp3Buffer = await mp3Res.arrayBuffer();

    // 4. Upload to Supabase Storage
    const fileName = `${decoded.userId}/${finalTrackId}.mp3`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from("music")
      .upload(fileName, mp3Buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (storageError) {
      console.error("Storage Upload Error:", storageError);
      return NextResponse.json({ error: "Failed to upload to storage" }, { status: 500 });
    }

    // 5. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from("music")
      .getPublicUrl(fileName);

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
        duration_ms: 0, // RapidAPI doesn't seem to return duration in this endpoint
      })
      .select()
      .single();

    if (dbError) {
       console.error("Database Insert Error:", dbError);
       return NextResponse.json({ error: "Failed to save song metadata" }, { status: 500 });
    }

    return NextResponse.json({ success: true, song });

  } catch (error) {
    console.error("Download API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
