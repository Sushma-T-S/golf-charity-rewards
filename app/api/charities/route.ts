import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, requireUser } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { data, error } = await supabaseAdmin.from("charities").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await request.json().catch(() => ({}));
  const { name, description, image_url, featured } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Charity name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("charities").insert([
    { name, description: description || "", image_url: image_url || null, featured: Boolean(featured) },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data?.[0] || null);
}

export async function PUT(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const body = await request.json().catch(() => ({}));
  const { id, name, description, image_url, featured } = body;

  if (!id) {
    return NextResponse.json({ error: "Charity id is required" }, { status: 400 });
  }

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (image_url !== undefined) updates.image_url = image_url;
  if (featured !== undefined) updates.featured = Boolean(featured);

  const { data, error } = await supabaseAdmin.from("charities").update(updates).eq("id", id).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || null);
}

export async function DELETE(request: Request) {
  const authCheck = await requireAdmin(request);
  if (!authCheck.ok) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing charity id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("charities").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
