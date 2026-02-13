import { NextResponse } from "next/server";

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: "user-read-email user-read-private user-library-read playlist-read-private playlist-read-collaborative",
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  );
}