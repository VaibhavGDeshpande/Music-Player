import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ error: "Server Configuration Error: JWT_SECRET is missing" }, { status: 500 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as { userId: string };

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const artist = formData.get("artist") as string | null;
    const album = formData.get("album") as string | null;
    const durationMsStr = formData.get("duration_ms") as string | null;

    if (!file || !title || !artist) {
      return NextResponse.json({ error: "Missing required fields (file, title, artist)" }, { status: 400 });
    }

    const durationMs = durationMsStr ? parseInt(durationMsStr, 10) : 0;
    
    // Generate custom spotify_id to satisfy DB constraint and identify custom tracks
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const storagePath = `${decoded.userId}/${customId}.${fileExtension}`;

    // Convert file to array buffer for upload
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("music")
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "audio/mpeg",
        upsert: true,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json({ error: "Failed to upload file to storage", message: storageError.message }, { status: 500 });
    }

    // Insert metadata into songs table
    const { data: song, error: dbError } = await supabase
      .from("songs")
      .insert({
        user_id: decoded.userId,
        spotify_id: customId,
        title,
        artist,
        album: album || "Single",
        cover_url: null, // Custom uploads do not have a Spotify cover URL, component handles null gracefully
        storage_path: storagePath,
        duration_ms: durationMs,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Clean up uploaded file from storage
      await supabase.storage.from("music").remove([storagePath]);
      return NextResponse.json({ error: "Failed to save song metadata to database", message: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
