import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function getRedirectUri(request: NextRequest) {
  return new URL("/api/auth/callback", request.url).toString();
}

export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = getRedirectUri(request);

  if (!clientId) {
    return NextResponse.json(
      { error: "Missing SPOTIFY_CLIENT_ID" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "user-read-email user-read-private user-library-read playlist-read-private playlist-read-collaborative user-read-recently-played user-top-read",
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  );
}
