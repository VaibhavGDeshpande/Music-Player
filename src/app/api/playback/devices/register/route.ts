import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getSessionClaims } from "@/lib/server/auth";

function sanitizeDeviceName(name: unknown) {
  if (typeof name !== "string") return "Web Player";
  const trimmed = name.trim();
  if (!trimmed) return "Web Player";
  return trimmed.slice(0, 80);
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getSessionClaims();
    const body = await request.json();

    const deviceKey = typeof body.deviceKey === "string" ? body.deviceKey : null;
    const deviceType = body.deviceType === "flutter" ? "flutter" : "web";
    const deviceName = sanitizeDeviceName(body.deviceName);

    if (!deviceKey) {
      return NextResponse.json({ error: "deviceKey is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: device, error } = await supabase
      .from("devices")
      .upsert(
        {
          user_id: userId,
          device_key: deviceKey,
          device_name: deviceName,
          device_type: deviceType,
          platform: typeof body.platform === "string" ? body.platform : null,
          app_version: typeof body.appVersion === "string" ? body.appVersion : null,
          is_online: true,
          last_seen_at: now,
          updated_at: now,
        },
        { onConflict: "user_id,device_key" }
      )
      .select()
      .single();

    if (error || !device) {
      return NextResponse.json({ error: error?.message || "Device registration failed" }, { status: 500 });
    }

    const { data: session } = await supabase
      .from("playback_sessions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!session) {
      await supabase.from("playback_sessions").insert({
        user_id: userId,
        active_device_id: device.id,
        is_playing: false,
        position_ms: 0,
        state_version: 1,
      });
    } else if (!session.active_device_id) {
      await supabase
        .from("playback_sessions")
        .update({
          active_device_id: device.id,
          updated_by_device_id: device.id,
          updated_at: now,
          state_version: session.state_version + 1,
        })
        .eq("id", session.id);
    }

    return NextResponse.json({ device });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
