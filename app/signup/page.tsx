"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [charities, setCharities] = useState<any[]>([]);
  const [selectedCharity, setSelectedCharity] = useState<string>("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Monthly");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadCharities();
  }, []);

  async function loadCharities() {
    const { data } = await supabase.from("charities").select("id, name");
    if (data?.length) {
      setCharities(data);
      setSelectedCharity(data[0].id);
    }
  }

  async function handleSignup() {
    if (!email || !password) {
      alert("Please fill in both email and password.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const userId = data?.user?.id;

    if (userId) {
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);

      const profilePayload: any = {
        id: userId,
        email,
        role: "user",
        subscription_plan: subscriptionPlan,
        subscription_status: "inactive",
        charity_percentage: 10,
        renewal_date: null,
      };

      if (selectedCharity) {
        profilePayload.charity_id = selectedCharity;
      }

      // Upsert profile row via server route (service role) to avoid client-side RLS/policy issues.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;


      if (accessToken) {
        const res = await fetch("/api/profile/upsert", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            email,
            subscriptionPlan,
            subscriptionStatus: "inactive",
            charityPercentage: 10,
            renewalDate: null,
            charityId: selectedCharity || null,
          }),
        });

        const out = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn("Profile upsert failed:", out?.error || res.status);
        }
      }

    }

    setLoading(false);
    setStatusMessage(
      "Signup successful! Please check your email for a confirmation link before logging in. After login, activate your paid plan from the dashboard."
    );
    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="text-3xl font-bold">Signup</h1>

      <div className="mt-6 grid gap-4">
        <input
          className="border p-3 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-3 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="grid gap-2">
          <label className="font-semibold">Choose a charity</label>
          <select
            className="border p-3 rounded"
            value={selectedCharity}
            onChange={(e) => setSelectedCharity(e.target.value)}
          >
            {charities.length > 0 ? (
              charities.map((charity) => (
                <option key={charity.id} value={charity.id}>
                  {charity.name}
                </option>
              ))
            ) : (
              <option value="">No charity loaded</option>
            )}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="font-semibold">Subscription plan</label>
          <select
            className="border p-3 rounded"
            value={subscriptionPlan}
            onChange={(e) => setSubscriptionPlan(e.target.value)}
          >
            <option value="Monthly">Monthly</option>
            <option value="Free">Free</option>
          </select>
        </div>

        <button
          onClick={handleSignup}
          className="rounded-full bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        {statusMessage && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-800">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
}
