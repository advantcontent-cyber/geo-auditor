import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAuthed } from "@/lib/adminAuth";
import { supabaseConfigured, getStats, getRecent } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  if (!isAuthed(store.get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseConfigured()) {
    return NextResponse.json({ configured: false });
  }

  try {
    const [stats, recent] = await Promise.all([getStats(), getRecent(12)]);
    return NextResponse.json({ configured: true, stats, recent });
  } catch (err) {
    console.error("Admin stats failed:", err);
    return NextResponse.json(
      { error: "Could not load stats from Supabase. Check the table and function are set up." },
      { status: 500 },
    );
  }
}
