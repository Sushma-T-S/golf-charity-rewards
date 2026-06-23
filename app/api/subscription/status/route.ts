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
    .from("subscriptions")
    .select("plan, status, renewal_date")
    .eq("user_id", user.id)
    .order("renewal_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log("/api/subscription/status supabaseAdmin error:", {
      userId: user.id,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      code: (error as any).code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
      table: "subscriptions",
    });

    return NextResponse.json(
      {
        error: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
        table: "subscriptions",
        userId: user.id,
        env: {
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    subscription: data || null,
    isActive: data?.status === "active",
  });
}

