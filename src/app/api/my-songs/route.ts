import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { data: songs, error } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching songs:", error);
      return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
    }

    return NextResponse.json({ songs }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("My Songs API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { trackId } = await request.json();

    if (!trackId) {
      return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
    }

    // First fetch the storage path so we can delete the file from the bucket
    const { data: song, error: fetchError } = await supabase
      .from("songs")
      .select("storage_path")
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId)
      .single();

    if (fetchError || !song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Delete file from storage
    if (song.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("music")
        .remove([song.storage_path]);
      
      if (storageError) {
        console.error("Storage Deletion Error:", storageError);
      }
    }

    // Delete DB record
    const { error: dbError } = await supabase
      .from("songs")
      .delete()
      .eq("user_id", decoded.userId)
      .eq("spotify_id", trackId);

    if (dbError) {
      console.error("DB Deletion Error:", dbError);
      return NextResponse.json({ error: "Failed to delete song record" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Song removed from cloud" });
  } catch (error) {
    console.error("My Songs DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
