import { getAccessToken } from "@/lib/spotify";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = "force-dynamic"; // always run fresh, never statically cache

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    } catch (jwtErr) {
      const isExpired = jwtErr instanceof jwt.TokenExpiredError;
      return NextResponse.json(
        { error: isExpired ? "Session expired" : "Invalid session" },
        { status: 401 }
      );
    }

    const accessToken = await getAccessToken(decoded.userId);
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get access token" }, { status: 401 });
    }

    // Use request.nextUrl directly — no need to re-parse request.url
    const { searchParams } = request.nextUrl;

    // Guard against NaN — fallback to safe defaults
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?offset=${offset}&limit=${limit}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return NextResponse.json(errBody, { status: response.status });
    }

    return NextResponse.json(await response.json(), {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in /api/liked-songs:", message);
    return NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    );
  }
}