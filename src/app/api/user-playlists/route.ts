import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// GET /api/user-playlists — List all playlists for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { data: playlists, error } = await supabase
      .from("playlists")
      .select("*")
      .eq("user_id", decoded.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching playlists:", error);
      return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
    }

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("User Playlists API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/user-playlists — Create a new playlist
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }

    const { data: playlist, error } = await supabase
      .from("playlists")
      .insert({
        user_id: decoded.userId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating playlist:", error);
      return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
    }

    return NextResponse.json({ playlist }, { status: 201 });
  } catch (error) {
    console.error("Create Playlist API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
