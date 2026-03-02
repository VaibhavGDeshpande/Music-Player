import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const { userId } = decoded;

    // Get the distinct available month/year combinations for this user
    // Since Supabase JS client doesn't support SELECT DISTINCT on multiple columns directly,
    // we fetch month/year and deduplicate in JavaScript. For a single user, this dataset is tiny (max 12 rows/year).
    const { data: historyData, error: historyError } = await supabase
      .from("play_history")
      .select("month, year")
      .eq("user_id", userId)
      .not("month", "is", null)
      .not("year", "is", null)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (historyError) {
      console.error("Error fetching available months:", historyError);
      return NextResponse.json({ error: "Failed to fetch available months" }, { status: 500 });
    }

    // If no history, just return the current month
    if (!historyData || historyData.length === 0) {
      const now = new Date();
      return NextResponse.json([{
        month: now.getMonth() + 1, // 1-indexed for standard usage
        year: now.getFullYear(),
        label: now.toLocaleString('default', { month: 'long', year: 'numeric' })
      }]);
    }
    
    // Deduplicate in JS
    const uniqueCombos = new Set<string>();
    const availableMonths = [];
    
    for (const row of historyData) {
      const key = `${row.year}-${row.month}`;
      if (!uniqueCombos.has(key)) {
        uniqueCombos.add(key);
        // Create a proper date object to format the month label
        const dateObj = new Date(row.year, row.month - 1, 1);
        availableMonths.push({
          month: row.month,
          year: row.year,
          label: dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })
        });
      }
    }

    return NextResponse.json(availableMonths);

  } catch (error) {
    console.error("Available Capsule Months API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
