import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const [{ count: activeUsersCount }, { data: subscriptions }, { data: charities }, { data: draws }, { data: winners }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact" }).eq("subscription_status", "active"),
    supabaseAdmin.from("profiles").select("subscription_status"),
    supabaseAdmin.from("charities").select("id,name"),
    supabaseAdmin.from("draws").select("id,status"),
    supabaseAdmin.from("winners").select("id,status,payment_status"),
  ]);

  const activeCount = Number(activeUsersCount || 0);
  const subscriptionSummary = Array.isArray(subscriptions)
    ? subscriptions.reduce(
        (acc: Record<string, number>, item: any) => {
          const key = item.subscription_status || "unknown";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {}
      )
    : {};

  const totalPool = activeCount * Number(process.env.SUBSCRIPTION_PRICE_MONTHLY || 10) * Number(process.env.PRIZE_POOL_CONTRIBUTION_PERCENT || 0.1);

  return NextResponse.json({
    activeUsers: activeCount,
    subscriptionSummary,
    totalPool,
    charityCount: Array.isArray(charities) ? charities.length : 0,
    drawCount: Array.isArray(draws) ? draws.length : 0,
    pendingWinners: Array.isArray(winners) ? winners.filter((w) => w.status === "pending").length : 0,
    paidWinners: Array.isArray(winners) ? winners.filter((w) => w.payment_status === "paid").length : 0,
  });
}
