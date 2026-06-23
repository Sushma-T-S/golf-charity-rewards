import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;
  const { data, error } = await supabaseAdmin
    .from("scores")
    .select("*")
    .eq("user_id", user.id)
    .order("score_date", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;

  // Enforce subscription gate (mock subscriptions table)
  const { data: sub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  if (!sub || sub.status !== "active") {
    return NextResponse.json(
      { error: "Subscription required" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { score, score_date } = body;

  if (typeof score !== "number" || !score || score < 1 || score > 45) {
    return NextResponse.json({ error: "Score must be an integer between 1 and 45." }, { status: 400 });
  }

  if (!score_date || typeof score_date !== "string") {
    return NextResponse.json({ error: "score_date is required." }, { status: 400 });
  }

  const { data: existingScore, error: selectError } = await supabaseAdmin
    .from("scores")
    .select("id")
    .eq("user_id", user.id)
    .eq("score_date", score_date)
    .maybeSingle();

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (existingScore) {
    const { error: updateError } = await supabaseAdmin
      .from("scores")
      .update({ score })
      .eq("id", existingScore.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { error: insertError } = await supabaseAdmin.from("scores").insert({
      user_id: user.id,
      score,
      score_date,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data: allScores, error: allScoresError } = await supabaseAdmin
    .from("scores")
    .select("id")
    .eq("user_id", user.id)
    .order("score_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!allScoresError && allScores && allScores.length > 5) {
    const idsToDelete = allScores.slice(5).map((score) => score.id);
    const { error: deleteError } = await supabaseAdmin
      .from("scores")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      console.warn("Could not enforce latest 5 scores cleanup:", deleteError.message);
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;
  const url = new URL(request.url);
  const scoreId = url.searchParams.get("id");

  if (!scoreId) {
    return NextResponse.json({ error: "Missing score id." }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("scores")
    .delete()
    .eq("id", scoreId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
