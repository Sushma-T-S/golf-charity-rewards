import { NextResponse } from "next/server";
import { runMonthlyDraw } from "@/lib/drawEngine";
import { requireAdmin } from "@/lib/adminAuth";

export function GET() {
  return NextResponse.json(
    {
      message:
        "Use POST to run the draw API. Example: POST /api/draw or POST /api/draw?simulate=true.",
    },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const url = new URL(request.url);
    const simulate = url.searchParams.get("simulate") === "true";

    const algorithmic = url.searchParams.get("algorithmic") === "true";
    const result = await runMonthlyDraw({ simulate, algorithmic });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Draw API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}