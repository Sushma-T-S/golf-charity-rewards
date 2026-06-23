import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Missing SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const numbers = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 45) + 1
    );

    const { error } = await supabaseAdmin.from("draws").insert({
      month: new Date().toLocaleString("default", { month: "long" }),
      year: new Date().getFullYear(),
      draw_numbers: numbers,
      type: "Monthly",
      status: "published",
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ numbers });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}