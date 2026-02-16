import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackid");

  if (!trackId) {
    return NextResponse.json({ error: "trackid is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://spotify-lyrics-topaz.vercel.app/?trackid=${trackId}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch lyrics" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Lyrics API error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
