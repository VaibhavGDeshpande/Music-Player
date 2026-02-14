import { getAccessToken } from "@/lib/spotify";
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET!
  ) as { userId: string };

  // Ensure fresh token
  const accessToken = await getAccessToken(decoded.userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", decoded.userId)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}