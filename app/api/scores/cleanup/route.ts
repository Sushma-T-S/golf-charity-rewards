import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { data: scores, error } = await supabaseAdmin
      .from("scores")
      .select("id, user_id, score_date, created_at")
      .order("user_id", { ascending: true })
      .order("score_date", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const toDelete: string[] = [];
    const seen = new Set<string>(); // key user_id|score_date

    for (const s of scores || []) {
      const key = `${s.user_id}|${s.score_date}`;
      if (seen.has(key)) {
        toDelete.push(s.id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length === 0) {
      return NextResponse.json({ removed: 0 });
    }

    const { error: delErr } = await supabaseAdmin.from("scores").delete().in("id", toDelete);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({ removed: toDelete.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
