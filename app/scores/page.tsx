"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";

export default function ScoresPage() {
  const [scores, setScores] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");

  async function loadScores() {
    const { data: { session }, error } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const user = session?.user;

    if (error || !user || !accessToken) return;

    const res = await fetch("/api/scores", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      console.error("Failed to load scores", await res.text());
      return;
    }

    const data = await res.json();
    setScores(data || []);
  }

  useEffect(() => {
    loadScores();
    // Load subscription gating status
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;

      const subRes = await fetch("/api/subscription/status", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const subBody = await subRes.json();
      setSubscriptionActive(Boolean(subBody?.isActive));
      setSubscriptionStatus(subBody?.subscription?.status || "inactive");
    })();
  }, []);


  async function addScore() {
    const trimmed = input.trim();
    const score = Number(trimmed);

    if (!trimmed || Number.isNaN(score) || !Number.isInteger(score)) {
      alert("Please enter a valid number between 1 and 45");
      return;
    }

    if (score < 1 || score > 45) {
      alert("Score must be between 1 and 45");
      return;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const user = session?.user;

    if (error || !user || !accessToken) return;

    const scoreDate = editingDate || new Date().toISOString().split("T")[0];

    const res = await fetch("/api/scores", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        score,
        score_date: scoreDate,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.json();
      alert(errorBody.error || "Unable to save score.");
      return;
    }

    setInput("");
    setEditingId(null);
    setEditingDate(null);
    loadScores();
  }

  async function editScore(s: any) {
    setEditingId(s.id);
    setEditingDate(s.score_date);
    setInput(String(s.score));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteScore(s: any) {
    if (!confirm(`Delete score ${s.score} on ${s.score_date}?`)) return;

    const { data: { session }, error } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const user = session?.user;
    if (error || !user || !accessToken) return;

    const res = await fetch(`/api/scores?id=${s.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.json();
      alert(body.error || "Unable to delete score");
      return;
    }

    // clear editing if deleting the one being edited
    if (editingId === s.id) {
      setEditingId(null);
      setEditingDate(null);
      setInput("");
    }

    loadScores();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Score Entry 🎯</h1>
      <p className="mt-2 text-sm text-slate-600">Note: Only one score is allowed per date. Submitting a score for today will update your existing entry for this date. The system keeps your latest 5 scores.</p>

      {!subscriptionActive && (
        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p className="font-semibold">Subscription required</p>
          <p className="mt-2">Your subscription is inactive, so score entry is restricted. Please activate your plan from the dashboard.</p>
        </div>
      )}

      <input
        className="border p-2 mt-3"
        type="number"
        min={1}
        max={45}
        step={1}
        placeholder="Enter score 1-45"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={!subscriptionActive}
      />

      <button
        onClick={addScore}
        className="ml-2 bg-green-600 text-white px-3 py-2 disabled:opacity-50"
        disabled={!subscriptionActive}
      >
        {editingId ? "Save" : "Add Score"}
      </button>

      <div className="mt-4">
        {scores.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-1">
            <div>
              <strong>{s.score}</strong> — <span className="text-sm text-slate-600">{s.score_date}</span>
            </div>
            <div className="space-x-2">
              <button onClick={() => editScore(s)} className="text-blue-600">Edit</button>
              <button onClick={() => deleteScore(s)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}