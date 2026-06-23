import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json({ profile: null, charityName: "Not selected" });
  }

  let charityName = "Not selected";

  if (profile.charity_id) {
    const { data: charityData, error: charityError } = await supabaseAdmin
      .from("charities")
      .select("name")
      .eq("id", profile.charity_id)
      .single();

    if (!charityError && charityData?.name) {
      charityName = charityData.name;
    }
  }

  return NextResponse.json({ profile, charityName });
}

export async function POST(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;
  const body = await request.json();
  const { updates } = body;

  if (!updates || typeof updates !== "object") {
    return NextResponse.json(
      { error: "Missing user_id or updates" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
