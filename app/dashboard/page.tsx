"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { supabase } from "../../supabase/client";

export default function Dashboard() {
  const [email, setEmail] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("Inactive");
  const [renewalDate, setRenewalDate] = useState<string | null>(null);
  const [charityPercentage, setCharityPercentage] = useState(10);
  const [charityName, setCharityName] = useState("Not selected");
  const [scores, setScores] = useState<any[]>([]);
  const [winnings, setWinnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    const { data: { session }, error } = await supabase.auth.getSession();
    const user = session?.user;

    if (error || !session?.access_token || !user) {
      router.push("/login");
      return;
    }

    const accessToken = session.access_token;
    setToken(accessToken);
    setEmail(user.email || "");

    const profileRes = await fetch(`/api/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profileResult = await profileRes.json();

    if (!profileRes.ok) {
      console.error("Failed to load profile", profileResult.error);
    }

    const profileData = profileResult.profile;
    const charityName = profileResult.charityName || "Not selected";

    if (!profileData) {
      await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          updates: {
            email: user.email,
            role: "user",
            subscription_plan: "Free",
            subscription_status: "inactive",
            charity_percentage: 10,
          },
        }),
      });
    }

    if (profileData) {
      setCharityPercentage(profileData.charity_percentage ?? 10);
      setCharityName(charityName);

      // Read subscription from mock subscriptions table (no Stripe)
      const subRes = await fetch("/api/subscription/status", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const subBody = await subRes.json();

      const subscription = subBody?.subscription;
      const isActive = subBody?.isActive;

      if (subscription?.plan) {
        setSubscriptionPlan(
          subscription.plan === "yearly" ? "Yearly" : "Monthly"
        );
      } else {
        setSubscriptionPlan("Free");
      }

      setSubscriptionStatus(isActive ? "Active" : "Inactive");
      setRenewalDate(subscription?.renewal_date ?? null);

      if (subscription?.plan === "yearly") setSelectedPlan("yearly");
      if (subscription?.plan === "monthly") setSelectedPlan("monthly");
    }

    const scoreRes = await fetch(`/api/scores`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const scoreData = await scoreRes.json();
    setScores(scoreData || []);

    const winnerRes = await fetch(`/api/winners`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const winnerData = await winnerRes.json();
    setWinnings(winnerData || []);
    setLoading(false);
  }

  async function handleCheckout(plan: "monthly" | "yearly") {
    if (!token) {
      router.push("/login");
      return;
    }

    setSaving(true);
    setSelectedPlan(plan);

    // Optimistic UI update so the user immediately sees the plan as active.
    setSubscriptionPlan(plan === "yearly" ? "Yearly" : "Monthly");
    setSubscriptionStatus("Active");

    const res = await fetch("/api/subscription/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Roll back optimistic UI
      setSubscriptionStatus("Inactive");
      setSubscriptionPlan("Free");
      setRenewalDate(null);
      const err = body?.error;
      alert(
        typeof err === "string"
          ? err
          : err?.message
          ? String(err.message)
          : err
          ? JSON.stringify(err)
          : "Unable to subscribe."
      );
      setSaving(false);
      return;
    }

    // Re-sync from DB to ensure correct status/renewal_date.
    const subRes = await fetch("/api/subscription/status", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const subBody = await subRes.json().catch(() => ({}));

    if (subRes.ok) {
      const subscription = subBody?.subscription;
      const isActive = subBody?.isActive;

      if (subscription?.plan) {
        setSubscriptionPlan(
          subscription.plan === "yearly" ? "Yearly" : "Monthly"
        );
      }

      setSubscriptionStatus(isActive ? "Active" : "Inactive");
      setRenewalDate(subscription?.renewal_date ?? null);

      if (subscription?.plan === "yearly") setSelectedPlan("yearly");
      if (subscription?.plan === "monthly") setSelectedPlan("monthly");
    }

    setSaving(false);
  }

  async function cancelSubscription() {
    if (!token) {
      router.push("/login");
      return;
    }

    if (!confirm("Cancel your subscription? This will stop future renewals.")) return;
    setSaving(true);

    const res = await fetch("/api/subscription/cancel", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await res.json();

    if (!res.ok) {
      alert(body.error || "Unable to cancel subscription.");
      setSaving(false);
      return;
    }

    setSubscriptionStatus("Inactive");
    setSubscriptionPlan("Free");
    setRenewalDate(null);
    setSaving(false);
  }

  if (loading) {
    return <div className="p-6 font-bold">Loading Dashboard...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard 🎉</h1>
          <p className="mt-2 text-slate-600">Logged in as <strong>{email}</strong></p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a href="/scores" className="rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">Add Scores</a>
          <a href="/admin" className="rounded-full bg-black px-4 py-2 text-white hover:bg-slate-700">Admin Panel</a>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-xl">Subscription</h2>
          <p className="mt-3">Plan: <strong>{subscriptionPlan}</strong></p>
          <p>Status: <strong>{subscriptionStatus}</strong></p>
          <p>Next renewal: <strong>{renewalDate ? new Date(renewalDate).toLocaleDateString() : "Not scheduled"}</strong></p>
          <div className="mt-4 space-y-2">
            <p>Charity donation share: <strong>{charityPercentage}%</strong></p>
            <p>Selected charity: <strong>{charityName}</strong></p>
          </div>
          {subscriptionStatus.toLowerCase() !== "active" ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => handleCheckout("monthly")}
                disabled={saving}
                className={`rounded-full px-5 py-3 text-white ${selectedPlan === "monthly" ? "bg-slate-900" : "bg-slate-700"} hover:bg-slate-600 disabled:opacity-50`}
              >
                {saving && selectedPlan === "monthly" ? "Starting checkout..." : "Subscribe Monthly"}
              </button>
              <button
                onClick={() => handleCheckout("yearly")}
                disabled={saving}
                className={`rounded-full px-5 py-3 text-white ${selectedPlan === "yearly" ? "bg-slate-900" : "bg-slate-700"} hover:bg-slate-600 disabled:opacity-50`}
              >
                {saving && selectedPlan === "yearly" ? "Starting checkout..." : "Subscribe Yearly"}
              </button>
            </div>
          ) : (
            <button
              onClick={cancelSubscription}
              disabled={saving}
              className="mt-6 rounded-full bg-rose-600 px-5 py-3 text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {saving ? "Processing..." : "Cancel Subscription"}
            </button>
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-xl">Latest scores</h2>
            {scores.length ? (
              scores.map((score) => (
                <div key={score.id} className="mt-3 rounded-2xl border border-slate-100 p-4">
                  <p className="font-medium">{score.score}</p>
                  <p className="text-sm text-slate-500">{score.score_date}</p>
                </div>
              ))
            ) : (
              <p className="mt-3 text-slate-500">No scores yet. Add your first entry.</p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-xl">Winnings</h2>
            <p className="mt-3">Total wins: <strong>{winnings.length}</strong></p>
            {winnings.length > 0 && (
              <div className="mt-4 space-y-3">
                {winnings.map((win) => (
                  <div key={win.id} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium">{win.match_type}</p>
                    <p className="text-sm text-slate-600">Status: {win.payment_status || win.status || "pending"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a href="/charities" className="rounded-full border border-slate-300 px-5 py-3 text-slate-900 hover:bg-slate-100">Choose a charity</a>
        <a href="/winners" className="rounded-full bg-amber-400 px-5 py-3 text-slate-950 hover:bg-amber-300">Check winner status</a>
        <a href="/upload-proof" className="rounded-full bg-slate-900 px-5 py-3 text-white hover:bg-slate-700">Upload proof</a>
      </div>

      <div className="mt-8">
        <LogoutButton />
      </div>
    </div>
  );
}
