import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getSessionClaims } from "@/lib/server/auth";

export async function GET() {
  try {
    const { userId } = await getSessionClaims();
    const now = new Date().toISOString();

    const { data: currentSession } = await supabase
      .from("playback_sessions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!currentSession) {
      await supabase.from("playback_sessions").insert({
        user_id: userId,
        is_playing: false,
        position_ms: 0,
        state_version: 1,
        updated_at: now,
      });
    }

    const [{ data: session, error: sessionError }, { data: devices, error: devicesError }] =
      await Promise.all([
        supabase.from("playback_sessions").select("*").eq("user_id", userId).single(),
        supabase
          .from("devices")
          .select("*")
          .eq("user_id", userId)
          .order("last_seen_at", { ascending: false }),
      ]);

    if (sessionError || devicesError) {
      return NextResponse.json(
        { error: sessionError?.message || devicesError?.message || "Failed to load playback session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId,
      session,
      devices: devices || [],
      serverTimeMs: Date.now(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
