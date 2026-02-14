import { supabase } from "@/lib/supabaseClient";

/**
 * Retrieves a valid access token for the given user.
 * If the current access token is expired or about to expire, it refreshes it
 * using the refresh_token stored in the database.
 */
export async function getAccessToken(userId: string): Promise<string | null> {
  try {
    // 1. Fetch current token and expiry from DB
    const { data: user, error } = await supabase
      .from("profiles")
      .select("access_token, refresh_token, token_expires_at")
      .eq("id", userId)
      .single();

    if (error || !user) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    // 2. Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiresAt = user.token_expires_at ? new Date(user.token_expires_at) : null;
    
    // Buffer of 5 minutes (300000 ms)
    const isExpired = !expiresAt || (expiresAt.getTime() - now.getTime() < 300000);

    if (!isExpired && user.access_token) {
      return user.access_token;
    }

    // 3. Refresh the token
    if (!user.refresh_token) {
      console.error("No refresh token available for user:", userId);
      return null;
    }

    console.log("Refreshing Spotify access token for user:", userId);

    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: user.refresh_token,
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to refresh token:", errorText);
        return null;
    }

    const data = await response.json();

    if (!data.access_token) {
        console.error("Invalid refresh token response:", data);
        return null;
    }

    // 4. Update DB with new token
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
    
    // If a new refresh token is returned, update it too (Spotify sometimes rotates them)
    const updates: any = {
        access_token: data.access_token,
        token_expires_at: newExpiresAt,
    };
    
    if (data.refresh_token) {
        updates.refresh_token = data.refresh_token;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (updateError) {
        console.error("Error updating user profile with new token:", updateError);
        // We still return the token so the current request succeeds
    }

    return data.access_token;

  } catch (err) {
    console.error("Exception in getAccessToken:", err);
    return null;
  }
}
