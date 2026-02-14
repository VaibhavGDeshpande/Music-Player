
import { getAccessToken } from "@/lib/spotify";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    const { id } = await params;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const accessToken = await getAccessToken(decoded.userId);

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to refresh access token" }, { status: 401 });
    }

    const response = await fetch(`https://api.spotify.com/v1/playlists/${id}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return NextResponse.json(
        { error: "Spotify rate limit exceeded", retryAfter },
        { status: 429 }
      );
    }

    if (!response.ok) {
       const text = await response.text();
       return NextResponse.json(
         { error: "Spotify API error", message: text },
         { status: response.status }
       );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (err: any) {
    console.error("Internal server error:", err);
    return NextResponse.json(
      { error: "Internal server error", message: err.message },
      { status: 500 }
    );
  }
}