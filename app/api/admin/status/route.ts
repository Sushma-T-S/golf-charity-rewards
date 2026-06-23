import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ isAdmin: false }, { status: authCheck.status });
  }

  const user = authCheck.user;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const adminEmails = (process.env.SUPABASE_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const isAdmin =
    Boolean(profile?.role === "admin") ||
    Boolean(profile?.is_admin) ||
    (user.email ? adminEmails.includes(user.email) : false);

  return NextResponse.json({
    isAdmin,
    userId: user.id,
    email: user.email,
  });
}
