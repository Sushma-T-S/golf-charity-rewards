"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/client";

// Replace with your admin email
const ADMIN_EMAILS = [
  "sushmats@gmail.com",
  "YOUR_ACTUAL_LOGIN_EMAIL@gmail.com"
];


export default function AdminPage() {
  const router = useRouter();
  const [drawResult, setDrawResult] = useState<any>(null);
  const [pendingWinners, setPendingWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [charities, setCharities] = useState<any[]>([]);
  const [charityName, setCharityName] = useState("");
  const [charityDescription, setCharityDescription] = useState("");
  const [charityFeatured, setCharityFeatured] = useState(false);
  const [drawMode, setDrawMode] = useState<"random" | "algorithmic">("random");
  const [simulateDraw, setSimulateDraw] = useState(false);


  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import("../../supabase/client");
        const { data: ud } = await supabase.auth.getUser();
        const userEmail = ud.user?.email?.toLowerCase();

      if (!userEmail) {
  router.push("/");
  return;
}

// TEMPORARY: allow any logged-in user
setIsAdmin(true);

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return;
        setToken(accessToken);
        setIsAdmin(true);

        // Admin endpoints expect the Authorization header with the session access token.
        loadAdminUsers(accessToken);
        loadMetrics(accessToken);
        loadCharities(accessToken);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);


  useEffect(() => {
    if (token) {
      loadPendingWinners();
      if (isAdmin) {
        loadAdminUsers(token);
      }
    }
  }, [token, isAdmin]);

  async function loadPendingWinners() {
    if (!token) return;
    setLoading(true);
    const res = await fetch("/api/winners/pending", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setPendingWinners(data.pending || []);
    setLoading(false);
  }

  async function loadAdminUsers(accessToken: string) {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.ok) {
      setAdminUsers(data?.users || []);
    } else {
      console.error("Failed to load admin users", data.error);
      // Surface error in UI by storing it in state (empty list means: show generic only when no error).
      setAdminUsers([]);
    }
    setUsersLoading(false);
  }

  async function loadMetrics(accessToken: string) {
    const res = await fetch("/api/admin/metrics", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.ok) {
      setMetrics(data);
    } else {
      console.error("Failed to load metrics", data.error);
    }
  }

  async function loadCharities(accessToken: string) {
    const res = await fetch("/api/charities", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.ok) {
      setCharities(data || []);
    } else {
      console.error("Failed to load charities", data.error);
    }
  }

  async function addCharity() {
    if (!token) return;
    if (!charityName.trim()) {
      alert("Charity name is required.");
      return;
    }

    const res = await fetch("/api/charities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: charityName,
        description: charityDescription,
        featured: charityFeatured,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Unable to create charity.");
      return;
    }

    setCharityName("");
    setCharityDescription("");
    setCharityFeatured(false);
    loadCharities(token);
  }

  async function removeCharity(id: string) {
    if (!token) return;
    if (!confirm("Delete this charity listing?")) return;

    const res = await fetch(`/api/charities?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Unable to delete charity.");
      return;
    }

    loadCharities(token);
  }

  async function toggleAdminStatus(userId: string, makeAdmin: boolean) {
    if (!token) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, isAdmin: makeAdmin }),
    });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Unable to update user");
      return;
    }

    loadAdminUsers(token);
  }

  async function handleRunDraw() {
    if (!token) return alert("Admin login required");
    setRunning(true);
    const res = await fetch(`/api/draw?simulate=${simulateDraw}&algorithmic=${drawMode === "algorithmic"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRunning(false);

    if (!res.ok) {
      alert(data.error || "Failed to run draw");
      return;
    }

    setDrawResult(data);
    loadPendingWinners();
  }

  async function handleRunCleanup() {
    if (!token) return alert("Admin login required");
    if (!confirm('Run scores cleanup to remove duplicate same-date scores?')) return;
    setRunning(true);
    const res = await fetch('/api/scores/cleanup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRunning(false);
    if (!res.ok) {
      alert(data.error || 'Cleanup failed');
      return;
    }
    alert(`Cleanup removed ${data.removed || 0} duplicate scores.`);
  }

  async function handleApproveWinner(id: string) {
    if (!token) return alert("Admin login required");
    const res = await fetch(`/api/winners/verify?id=${id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Unable to approve winner");
      return;
    }
    loadPendingWinners();
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Admin Panel 🧑‍💼</h1>
      <p className="mt-2 text-slate-600">Run the monthly draw and verify pending winners.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={drawMode === "random"}
              onChange={() => setDrawMode("random")}
            />
            Random
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={drawMode === "algorithmic"}
              onChange={() => setDrawMode("algorithmic")}
            />
            Algorithmic
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={simulateDraw}
              onChange={() => setSimulateDraw(!simulateDraw)}
            />
            Simulate only
          </label>
        </div>

        <button
          onClick={handleRunDraw}
          disabled={running || !isAdmin}
          className="rounded-full bg-red-600 px-5 py-3 text-white hover:bg-red-500 disabled:opacity-50"
        >
          {running ? "Running draw..." : "Run Monthly Draw"}
        </button>
        <button
          id="admin-cleanup-btn"
          onClick={handleRunCleanup}
          disabled={running || !isAdmin}
          className="rounded-full bg-yellow-600 px-5 py-3 text-white hover:bg-yellow-500 disabled:opacity-50"
        >
          {running ? "Running..." : "Run Scores Cleanup"}
        </button>
      </div>
      {!isAdmin && token && (
        <p className="mt-3 text-sm text-red-600">You are not authorized to perform admin actions.</p>
      )}

      {drawResult && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Latest draw result</h2>
          <p className="mt-3">Numbers: <strong>{(drawResult.drawNumbers || drawResult.draw_numbers || []).join(", ")}</strong></p>
          <p className="mt-2">Pool: <strong>${Math.round(drawResult.pool || 0)}</strong></p>
          {drawMode === "algorithmic" && <p className="mt-2 text-sm text-slate-600">Mode: Algorithmic</p>}
          {simulateDraw && <p className="mt-2 text-sm text-slate-600">Simulation only: no draw record created.</p>}
        </div>
      )}

      {metrics && (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Site metrics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Active subscribers</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.activeUsers}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Pending winner approvals</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.pendingWinners}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total pool estimate</p>
              <p className="mt-2 text-2xl font-semibold">${Math.round(metrics.totalPool || 0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Registered charities</p>
              <p className="mt-2 text-2xl font-semibold">{metrics.charityCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Pending winner approvals</h2>
        {loading ? (
          <p className="mt-3">Loading pending winner queue…</p>
        ) : pendingWinners.length ? (
          <div className="mt-4 space-y-4">
            {pendingWinners.map((winner) => (
              <div key={winner.id} className="rounded-2xl border border-slate-100 p-4">
                <p className="font-medium">User ID: {winner.user_id}</p>
                <p>Match: {winner.match_type}</p>
                <p>Status: {winner.status || winner.payment_status || "pending"}</p>
                <button
                  onClick={() => handleApproveWinner(winner.id)}
                  className="mt-3 rounded-full bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
                >
                  Approve winner
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-slate-500">No pending winner approvals.</p>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Charity management</h2>
        <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
          <div>
            <label className="block text-sm font-medium text-slate-700">Charity name</label>
            <input
              type="text"
              value={charityName}
              onChange={(e) => setCharityName(e.target.value)}
              className="mt-2 w-full rounded-2xl border px-4 py-3"
            />
            <label className="mt-4 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={charityDescription}
              onChange={(e) => setCharityDescription(e.target.value)}
              className="mt-2 w-full rounded-2xl border px-4 py-3"
              rows={4}
            />
            <label className="mt-4 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={charityFeatured}
                onChange={(e) => setCharityFeatured(e.target.checked)}
              />
              Featured charity
            </label>
            <button
              onClick={addCharity}
              className="mt-4 rounded-full bg-slate-900 px-5 py-3 text-white hover:bg-slate-700"
            >
              Add charity
            </button>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Charity list</h3>
            {charities.length ? (
              <div className="mt-4 space-y-3">
                {charities.map((charity) => (
                  <div key={charity.id} className="rounded-2xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{charity.name}</p>
                        <p className="text-sm text-slate-600">{charity.featured ? "Featured" : "Standard"}</p>
                      </div>
                      <button
                        onClick={() => removeCharity(charity.id)}
                        className="rounded-full bg-rose-600 px-4 py-2 text-white hover:bg-rose-500"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{charity.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-slate-500">No charities available yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Admin user controls</h2>
        {usersLoading ? (
          <p className="mt-3">Loading users…</p>
        ) : adminUsers.length ? (
          <div className="mt-4 grid gap-3">
            {adminUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-4">
                    <div>
                    <p className="font-medium">{user.name || user.email || user.id}</p>
                    <p className="text-sm text-slate-600">{user.email || user.id}</p>
                    <p className="text-sm text-slate-600">Subscription: {user.subscription_status ? user.subscription_status : user.subscription_plan ? user.subscription_plan : "inactive"}</p>
                  </div>
                  <button
                    onClick={() => toggleAdminStatus(user.id, !user.is_admin)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
                  >
                    {user.is_admin ? "Revoke admin" : "Make admin"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-slate-500">No users found or user listing unavailable.</p>
        )}
      </div>
    </div>
  );
}
