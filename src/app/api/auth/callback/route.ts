import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  SpotifyTokenResponse,
  SpotifyProfile,
} from "@/types/spotify";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Missing code" },
      { status: 400 }
    );
  }

  // Exchange code for token
  const tokenRes = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      }),
    }
  );

  const tokenData =
    (await tokenRes.json()) as SpotifyTokenResponse;

  // Fetch profile
  const profileRes = await fetch(
    "https://api.spotify.com/v1/me",
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  );

  const profile =
    (await profileRes.json()) as SpotifyProfile;

  const expiresAt = new Date(
    Date.now() + tokenData.expires_in * 1000
  );

  // Upsert into Supabase
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      spotify_user_id: profile.id,
      display_name: profile.display_name,
      email: profile.email,
      profile_image_url: profile.images?.[0]?.url,
      country: profile.country,
      product_type: profile.product,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Create JWT session
  const sessionToken = jwt.sign(
    { userId: data.id },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );

  const response = NextResponse.redirect(
    new URL("/dashboard", request.url)
  );

  response.cookies.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}