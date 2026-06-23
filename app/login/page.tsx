"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    setErrorMessage(null);
    setShowResend(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      // Surface the real Supabase error so we can distinguish wrong password vs email not confirmed.
      const msg = error.message || "Login failed";
      const needsConfirm = /confirm|email not confirmed|verify|confirmation/i.test(msg);
      setErrorMessage(msg);
      setShowResend(needsConfirm);
      return;
    }


    alert("Login successful!");
    router.push("/dashboard");
  }

  async function resendConfirmation() {
    if (!email) {
      alert("Enter your email address to resend confirmation.");
      return;
    }

    setResendLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Confirmation email resent. Check your inbox or spam folder.");
  }

  return (
    <div className="max-w-sm mx-auto mt-20 flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Login</h1>

      <input
        type="email"
        placeholder="Email"
        className="border p-2"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="bg-blue-500 text-white p-2 rounded"
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      {errorMessage && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      {showResend && (
        <button
          onClick={resendConfirmation}
          className="mt-3 rounded-full bg-amber-500 px-4 py-2 text-slate-900 hover:bg-amber-400"
          disabled={resendLoading}
        >
          {resendLoading ? "Resending..." : "Resend confirmation email"}
        </button>
      )}
    </div>
  );
}