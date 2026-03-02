import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getSessionClaims } from "@/lib/server/auth";

export async function GET() {
  try {
    const { userId } = await getSessionClaims();

    if (!process.env.SUPABASE_JWT_SECRET) {
      return NextResponse.json(
        { error: "SUPABASE_JWT_SECRET is not configured" },
        { status: 500 }
      );
    }

    const token = jwt.sign(
      {
        role: "authenticated",
        aud: "authenticated",
        sub: userId,
      },
      process.env.SUPABASE_JWT_SECRET,
      { expiresIn: "15m" }
    );

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
