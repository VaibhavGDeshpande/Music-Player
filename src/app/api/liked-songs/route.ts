import { getAccessToken } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const accessToken = await getAccessToken(decoded.userId);

    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get access token" }, { status: 401 });
    }

    // Read pagination params from query string
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 50);

    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(await response.json(), { status: response.status });
    }

    return NextResponse.json(await response.json());
  } catch (err: any) {
    console.error("Error in /api/liked-songs:", err);
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}
