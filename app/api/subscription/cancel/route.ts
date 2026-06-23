import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/adminAuth";

export async function POST(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "inactive" })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

