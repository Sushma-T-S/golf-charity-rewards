import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/adminAuth";

// Server-side upsert for the authenticated user's profiles row.
// This avoids client-side RLS/policy issues that can prevent the profile row
// from being created after signup.
export async function POST(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;
  const body = await request.json().catch(() => ({}));

  const {
    email,
    subscriptionPlan,
    subscriptionStatus,
    charityPercentage,
    renewalDate,
    charityId,
  } = body || {};

  if (!user?.id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // Defaults align with current client signup behavior.
  const profilePayload: Record<string, any> = {
    id: user.id,
    email,
    role: "user",
    subscription_plan: subscriptionPlan ?? "Monthly",
    subscription_status: subscriptionStatus ?? "inactive",
    charity_percentage: charityPercentage ?? 10,
    renewal_date: renewalDate ?? null,
  };

  if (charityId) {
    profilePayload.charity_id = charityId;
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

