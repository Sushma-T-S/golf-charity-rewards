"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";

export default function CharitiesPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("charities").select("*");
      setData(data || []);
    }

    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Charities ❤️</h1>

      {data.map((c) => (
        <div key={c.id} className="border p-3 mt-3">
          <h2>{c.name}</h2>
          <p>{c.description}</p>
        </div>
      ))}
    </div>
  );
}