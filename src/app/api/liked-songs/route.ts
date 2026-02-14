import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

  const { data: user, error } = await supabase
    .from("profiles")
    .select("access_token")
    .eq("id", decoded.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const response = await fetch("https://api.spotify.com/v1/me/tracks?limit=50", {
    headers: {
      Authorization: `Bearer ${user.access_token}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(await response.json(), { status: response.status });
  }

  return NextResponse.json(await response.json());
}
