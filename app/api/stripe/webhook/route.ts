import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecret) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2022-11-15",
});

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret!
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id as string | undefined;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | undefined;

        if (userId && customerId) {
          await supabaseAdmin.from("profiles").upsert(
            {
              id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId || null,
              subscription_status: "active",
              subscription_plan: "Monthly",
            },
            { onConflict: "id" }
          );
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | undefined;
        if (customerId) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (profile?.id) {
            await supabaseAdmin
              .from("profiles")
              .update({ subscription_status: "past_due" })
              .eq("id", profile.id);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profile?.id) {
          await supabaseAdmin
            .from("profiles")
            .update({ subscription_status: "inactive", stripe_subscription_id: null })
            .eq("id", profile.id);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error("Stripe webhook processing failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
