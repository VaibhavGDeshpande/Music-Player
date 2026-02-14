import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    const { id } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔐 Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as { userId: string };

    // 🔍 Get Spotify access token from DB
    const { data: user, error } = await supabase
      .from("profiles")
      .select("access_token")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 🎵 Fetch playlist from Spotify
    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${id}`,
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        },
        next: { revalidate: 60 }, // ✅ cache 60 seconds
      }
    );


    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");

      return NextResponse.json(
        {
          error: "Spotify rate limit exceeded",
          retryAfter,
        },
        { status: 429 }
      );
    }


    if (!response.ok) {
      const text = await response.text(); // safe instead of json()

      console.error(
        `Spotify error (${response.status}):`,
        text
      );

      return NextResponse.json(
        {
          error: "Spotify API error",
          status: response.status,
          message: text,
        },
        { status: response.status }
      );
    }

    // ✅ Safe JSON parsing
    const data = await response.json();

    return NextResponse.json(data);

  } catch (err: any) {
    console.error("Internal server error:", err);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: err.message,
      },
      { status: 500 }
    );
  }
}