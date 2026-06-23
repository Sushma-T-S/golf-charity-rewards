import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, is_admin, name, subscription_status, subscription_plan, renewal_date, charity_percentage")
    .order("email", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message, details: String(error) }, { status: 500 });
  }

  // Return both the rows and a quick count so the admin UI can distinguish
  // between "no users" vs "fetch failed".
  return NextResponse.json({ users: data || [], count: data?.length || 0 });
}

export async function POST(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await request.json().catch(() => ({}));
  const { userId, isAdmin } = body;

  if (!userId || typeof isAdmin !== "boolean") {
    return NextResponse.json({ error: "Missing userId or isAdmin flag" }, { status: 400 });
  }

  // Hard block: only allow promoting/demoting users to admin
  // if the target user's email is in the allowlist.
  // (Prevents random users from escalating via this endpoint.)
  const adminEmails = (process.env.SUPABASE_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (isAdmin) {
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      return NextResponse.json(
        { error: targetError.message },
        { status: 500 }
      );
    }

    const targetEmail = target?.email?.toLowerCase();
    if (!targetEmail || !adminEmails.includes(targetEmail)) {
      return NextResponse.json(
        { error: "Forbidden: target email is not an admin" },
        { status: 403 }
      );
    }
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", userId);


  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
