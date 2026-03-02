import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getSessionClaims } from "@/lib/server/auth";
import type { PlaybackCommand } from "@/types/playback";

function toPositionMs(value: unknown, fallback = 0) {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.round(value));
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getSessionClaims();
    const cmd = (await request.json()) as PlaybackCommand;

    if (!cmd?.type || !cmd.deviceId || !cmd.commandId || typeof cmd.expectedVersion !== "number") {
      return NextResponse.json({ error: "Invalid command payload" }, { status: 400 });
    }

    const { data: actorDevice } = await supabase
      .from("devices")
      .select("id")
      .eq("id", cmd.deviceId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!actorDevice) {
      return NextResponse.json({ error: "Unknown device" }, { status: 404 });
    }

    const { data: session, error: sessionErr } = await supabase
      .from("playback_sessions")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (sessionErr || !session) {
      return NextResponse.json({ error: sessionErr?.message || "Session not found" }, { status: 500 });
    }

    if (session.last_command_id === cmd.commandId) {
      return NextResponse.json({ session, deduplicated: true });
    }

    const now = new Date().toISOString();
    const baseUpdate: Record<string, unknown> = {
      updated_at: now,
      updated_by_device_id: cmd.deviceId,
      last_command_id: cmd.commandId,
      state_version: session.state_version + 1,
    };

    if (cmd.type === "PLAY") {
      if (!cmd.track) {
        return NextResponse.json({ error: "PLAY requires track payload" }, { status: 400 });
      }
      baseUpdate.active_device_id = cmd.deviceId;
      baseUpdate.is_playing = true;
      baseUpdate.position_ms = toPositionMs(cmd.positionMs, 0);
      baseUpdate.position_updated_at = now;
      baseUpdate.playback_rate = typeof cmd.playbackRate === "number" ? cmd.playbackRate : 1;
      baseUpdate.track_id = cmd.track.id;
      baseUpdate.track_title = cmd.track.title;
      baseUpdate.artist_name = cmd.track.artist;
      baseUpdate.cover_url = cmd.track.cover || null;
      baseUpdate.stream_url = cmd.track.streamUrl;
      baseUpdate.duration_ms = cmd.track.durationMs ?? null;
    }

    if (cmd.type === "PAUSE") {
      baseUpdate.active_device_id = cmd.deviceId;
      baseUpdate.is_playing = false;
      baseUpdate.position_ms = toPositionMs(cmd.positionMs, session.position_ms);
      baseUpdate.position_updated_at = now;
    }

    if (cmd.type === "SEEK" || cmd.type === "SYNC_POSITION") {
      baseUpdate.active_device_id = cmd.deviceId;
      baseUpdate.position_ms = toPositionMs(cmd.positionMs, session.position_ms);
      baseUpdate.position_updated_at = now;
      if (cmd.type === "SEEK") {
        baseUpdate.is_playing = session.is_playing;
      }
    }

    if (cmd.type === "SWITCH_DEVICE") {
      if (!cmd.targetDeviceId) {
        return NextResponse.json({ error: "SWITCH_DEVICE requires targetDeviceId" }, { status: 400 });
      }
      const { data: targetDevice } = await supabase
        .from("devices")
        .select("id")
        .eq("id", cmd.targetDeviceId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!targetDevice) {
        return NextResponse.json({ error: "Target device not found" }, { status: 404 });
      }
      baseUpdate.active_device_id = cmd.targetDeviceId;
      baseUpdate.position_updated_at = now;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("playback_sessions")
      .update(baseUpdate)
      .eq("user_id", userId)
      .eq("state_version", cmd.expectedVersion)
      .select("*")
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "VERSION_CONFLICT" }, { status: 409 });
    }

    return NextResponse.json({ session: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
