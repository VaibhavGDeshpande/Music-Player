import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    const { data: songs, error } = await supabase
      .from("songs")
      .select("*")
      .eq("user_id", decoded.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching songs:", error);
      return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 });
    }

    return NextResponse.json({ songs });
  } catch (error) {
    console.error("My Songs API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
