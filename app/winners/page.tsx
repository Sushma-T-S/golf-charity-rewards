"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase/client";

export default function WinnersPage() {
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadWinners();
  }, []);

  async function loadWinners() {
    setLoading(true);
    const { data: { session }, error } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const user = session?.user;

    if (error || !user || !accessToken) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/winners", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.error("Failed to load winners", await res.text());
      setLoading(false);
      return;
    }

    const data = await res.json();
    setWinners(data || []);
    setLoading(false);
  }

  if (loading) {
    return <div className="p-6 font-bold">Loading winners...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Your Winner History 🏆</h1>
      {winners.length === 0 ? (
        <p className="mt-4 text-slate-600">You have no winnings yet. Keep entering scores and check the monthly draw!</p>
      ) : (
        <div className="mt-6 grid gap-4">
          {winners.map((win) => (
            <div key={win.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-semibold">{win.match_type}</p>
              <p className="mt-2 text-slate-600">Status: {win.payment_status || win.status || "pending"}</p>
              <p className="mt-2 text-slate-600">Draw: {win.draw_id ?? "Pending draw assignment"}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <a href="/upload-proof" className="rounded-full bg-slate-900 px-5 py-3 text-white hover:bg-slate-700">
          Upload proof for verification
        </a>
      </div>
    </div>
  );
}
