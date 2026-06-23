"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";

export default function DrawsPage() {
  const [draws, setDraws] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("draws")
        .select("*")
        .order("created_at", { ascending: false });

      setDraws(data || []);
    }

    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Monthly Draws 🎲</h1>

      {draws.map((d) => (
        <div key={d.id} className="border p-3 mt-3">
          <p>{d.month} {d.year}</p>
          <p>{d.draw_numbers?.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}