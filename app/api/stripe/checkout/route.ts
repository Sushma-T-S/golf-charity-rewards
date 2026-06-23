import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUser } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export async function POST(request: Request) {
  const authCheck = await requireUser(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const user = authCheck.user;
  const { plan = "monthly" } = await request.json().catch(() => ({ plan: "monthly" }));

  if (!process.env.STRIPE_PRICE_MONTHLY_ID) {
    return NextResponse.json(
      { error: "Missing Stripe price ID configuration" },
      { status: 500 }
    );
  }

  const priceId = plan === "yearly" ? process.env.STRIPE_PRICE_YEARLY_ID : process.env.STRIPE_PRICE_MONTHLY_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price ID not configured for selected plan" },
      { status: 500 }
    );
  }

  const { data: existingProfile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, email, charity_percentage, charity_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  let stripeCustomerId = existingProfile?.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        user_id: user.id,
      },
    });
    stripeCustomerId = customer.id;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/dashboard?checkout=cancel`,
    metadata: {
      user_id: user.id,
    },
  });

  return NextResponse.json({ url: session.url });
}
