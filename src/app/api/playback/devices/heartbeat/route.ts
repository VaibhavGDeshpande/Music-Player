import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getSessionClaims } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getSessionClaims();
    const body = await request.json();
    const now = new Date().toISOString();

    if (typeof body.deviceId !== "string") {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("devices")
      .update({
        is_online: body.isOnline !== false,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", body.deviceId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
