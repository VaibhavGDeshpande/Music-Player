import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get("session")?.value;
  const { id } = await params;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

  const { data: user, error } = await supabase
    .from("profiles")
    .select("access_token")
    .eq("id", decoded.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
    headers: {
      Authorization: `Bearer ${user.access_token}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error(`Error fetching playlist ${id}: ${response.status}`, errorBody);
    return NextResponse.json(errorBody, { status: response.status });
  }

  const data = await response.json();
  console.log(`Fetched playlist ${id} successfully. Total tracks: ${data.tracks?.total}`);
  // Log the first track to check structure if it exists
  if (data.tracks?.items?.length > 0) {
    console.log("First track sample:", JSON.stringify(data.tracks.items[0], null, 2));
  } else {
    console.log("Track items are empty or missing:", JSON.stringify(data.tracks, null, 2));
  }
  return NextResponse.json(data);
}
