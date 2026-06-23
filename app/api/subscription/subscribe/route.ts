import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireUser } from "@/lib/adminAuth";

function maskError(err: unknown) {
  if (!err) return null;
  if (typeof err === "string") return { message: err };
  if (typeof err === "object" && "message" in err) {
    return {
      message: (err as any).message,
      name: (err as any).name,
      details: (err as any).details,
      hint: (err as any).hint,
    };
  }
  return err;
}

export async function POST(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;

  const body = await request.json().catch(() => ({}));
  const { plan } = body as { plan?: string };

  const normalizedPlan = plan === "yearly" ? "yearly" : "monthly";
  const renewalDays = normalizedPlan === "yearly" ? 365 : 30;

  const renewalDate = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const env = {
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  };

  // Ensure the user exists in auth.users (FK target).
  const {
    data: { user: authUser },
    error: authUserErr,
  } = await supabaseAdmin.auth.admin.getUserById(user.id);

  if (authUserErr || !authUser) {
    return NextResponse.json(
      {
        error:
          "Authenticated user does not exist in auth.users for this Supabase project.",
        env,
        authUserErr: maskError(authUserErr),
        userId: user.id,
      },
      { status: 400 }
    );
  }

  const { error: delErr } = await supabaseAdmin
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (delErr) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: delErr.message,
          details: delErr,
          operation: "delete",
          table: "subscriptions",
        },
        env,
        userId: user.id,
      },
      { status: 500 }
    );
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan: normalizedPlan,
      status: "active",
      renewal_date: renewalDate,
    })
    .select("plan, status, renewal_date")
    .maybeSingle();

  if (insErr) {
    console.log("/api/subscription/subscribe insert error:", {
      userId: user.id,
      env,
      supabaseAdminUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      code: (insErr as any).code,
      message: insErr.message,
      details: (insErr as any).details,
      hint: (insErr as any).hint,
      table: "subscriptions",
      payload: {
        user_id: user.id,
        plan: normalizedPlan,
        status: "active",
        renewal_date: renewalDate,
      },
    });

    // Return full error so UI can see "permission denied" and related hints.
    const normalizedError = {
      message: insErr.message,
      code: (insErr as any).code,
      details: (insErr as any).details,
      hint: (insErr as any).hint,
      operation: "insert",
      table: "subscriptions",
    };

    return NextResponse.json(
      {
        success: false,
        error: normalizedError,
        env,
        userId: user.id,
        normalizedPlan,
      },
      { status: 500 }
    );
  }



  return NextResponse.json({ success: true, subscription: inserted });
}






